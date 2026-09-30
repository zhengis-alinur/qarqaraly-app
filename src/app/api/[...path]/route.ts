import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser, session, limit, hash, sendToken, errorStatus } from '@/lib/auth';
import { normalizePhone, sendPhoneCode, verifyPhoneCode, phoneFromToken } from '@/lib/phone';
import { listingSchema, articleSchema } from '@/lib/validation';
import type { Listing, User, Article, Taxonomy } from '@/lib/types';
export const runtime='nodejs';
const ok=(data:unknown={ok:true})=>NextResponse.json(data);
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});
async function handle(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
 try {
  const parts=(await params).path, route=parts.join('/'), method=req.method;
  if(route==='health'&&method==='GET'){await (await db()).command({ping:1});return ok({status:'ok'});}
  if(method==='POST') {
   const origin=req.headers.get('origin');
   if(origin!==new URL(process.env.APP_URL||req.url).origin)return fail('Недопустимый источник запроса',403);
   if(Number(req.headers.get('content-length')||0)>11*1024*1024)return fail('Файл слишком большой',413);
  }
  const database=await db(), listings=database.collection<Listing>('listings'),users=database.collection<User>('users');
  const ip=process.env.TRUST_PROXY==='true'?(req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown'):'local';
  if(route==='upload'&&method==='POST') {
   const user=await requireUser(); await limit(`upload:${user._id}`,50,3600);
   const file=(await req.formData()).get('file');
   if(!(file instanceof File)||file.size>10*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))return fail('Выберите JPG, PNG или WebP размером до 10 МБ');
   const buffer=Buffer.from(await file.arrayBuffer());
   const pipeline=sharp(buffer,{limitInputPixels:40000000,animated:false});const meta=await pipeline.metadata();
   if(!['jpeg','png','webp'].includes(meta.format||''))return fail('Неподдерживаемый формат');
   const image=await pipeline.rotate().resize(1800,1800,{fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
   const name=`${randomUUID()}.webp`,dir=path.resolve(process.env.UPLOAD_DIR||'uploads');await mkdir(dir,{recursive:true});await writeFile(path.join(dir,name),image);
   await database.collection('photos').insertOne({url:`/uploads/${name}`,ownerId:user._id,createdAt:new Date()});return ok({url:`/uploads/${name}`});
  }
  if(method==='GET'&&route==='stats') {
   const user=await requireUser();const days=Math.max(1,Math.min(365,Number(req.nextUrl.searchParams.get('days'))||30));
   const owned=await listings.find(user.role==='admin'?{}:{ownerId:user._id},{projection:{_id:1}}).toArray();
   const rows=await database.collection('events').aggregate([{$match:{listingId:{$in:owned.map(l=>l._id)},createdAt:{$gte:new Date(Date.now()-days*86400000)}}},{$group:{_id:{listingId:'$listingId',type:'$type'},count:{$sum:1}}}]).toArray();return ok(rows);
  }
  if(method!=='POST')return fail('Не найдено',404);
  const body=await req.json();
  if(parts[0]==='auth') {
   if(parts[1]==='logout'){(await cookies()).delete('session');return ok();}
   await limit(`auth:${ip}`,60,900);
   if(parts[1]==='verify'||parts[1]==='reset') {
    const token=z.string().regex(/^[a-f0-9]{64}$/).parse(body.token);
    const password=parts[1]==='reset'?z.string().min(10).max(72).parse(body.password):null;
    const record=await database.collection('tokens').findOneAndUpdate({hash:hash(token),purpose:parts[1],used:false,expiresAt:{$gt:new Date()}},{$set:{used:true}},{returnDocument:'before'});
    if(!record)return fail('Ссылка недействительна или срок её действия истёк');
    if(password)await users.updateOne({_id:record.userId},{$set:{passwordHash:await bcrypt.hash(password,12)},$inc:{sessionVersion:1}});
    else await users.updateOne({_id:record.userId},{$set:{verified:true}});
    return ok();
   }
   if(parts[1]==='phone') {
    const phone=normalizePhone(body.phone);
    if(parts[2]==='send-code')return ok(await sendPhoneCode(phone,ip,z.enum(['signup','login','reset']).parse(body.purpose)));
    if(parts[2]==='verify-code')return ok({token:await verifyPhoneCode(phone,z.string().regex(/^\d{6}$/,'Код состоит из шести цифр').parse(body.code))});
    // Вход по номеру и паролю: постоянным пользователям не нужна SMS при каждом входе.
    if(parts[2]==='password') {
     const password=z.string().min(10).max(72).parse(body.password);await limit(`phone-password:${phone}`,10,900);const user=await users.findOne({phone});
     if(!user||!user.passwordHash||!await bcrypt.compare(password,user.passwordHash))return fail('Неверный номер или пароль');
     await session(user);return ok({redirect:user.role==='admin'?'/admin':'/dashboard'});
    }
    return fail('Не найдено',404);
   }
   // Токен ниже доказывает владение номером: его выдаёт phone/verify-code и живёт десять минут.
   if(['phone-register','phone-login','phone-reset'].includes(parts[1])) {
    const phone=await phoneFromToken(body.token);const account=await users.findOne({phone});
    if(parts[1]==='phone-register') {
     if(account)return fail('Этот номер уже зарегистрирован. Войдите или восстановите пароль.');
     const password=z.string().min(10).max(72).parse(body.password);
     // Номер подтверждён кодом, поэтому аккаунт сразу может отправлять объекты на модерацию.
     const user:User={_id:randomUUID(),phone,passwordHash:await bcrypt.hash(password,12),role:'business',verified:true,sessionVersion:0};
     await users.insertOne(user);await session(user);return ok({redirect:'/dashboard'});
    }
    if(!account)return fail('Аккаунт с этим номером не найден. Сначала зарегистрируйтесь.');
    if(parts[1]==='phone-reset') {
     const password=z.string().min(10).max(72).parse(body.password);
     await users.updateOne({_id:account._id},{$set:{passwordHash:await bcrypt.hash(password,12)},$inc:{sessionVersion:1}});
     return ok({message:'Пароль изменён. Войдите с новым паролем.'});
    }
    await session(account);return ok({redirect:account.role==='admin'?'/admin':'/dashboard'});
   }
   const email=z.email().max(254).parse(body.email).toLowerCase();await limit(`email:${email}`,10,900);
   const existing=await users.findOne({email});
   if(parts[1]==='forgot'||parts[1]==='resend') {if(existing&&(parts[1]==='forgot'||!existing.verified))await sendToken(existing,parts[1]==='forgot'?'reset':'verify');return ok({message:'Если аккаунт существует, письмо отправлено. Проверьте почту.'});}
   const password=z.string().min(10).max(72).parse(body.password);
   if(parts[1]==='register') {
    if(existing)return fail('Этот email уже зарегистрирован. Войдите или восстановите пароль.');
    const user:User={_id:randomUUID(),email,passwordHash:await bcrypt.hash(password,12),role:'business',verified:false,sessionVersion:0};await users.insertOne(user);
    try{await sendToken(user,'verify');}catch{await session(user);return ok({redirect:'/dashboard',message:'Аккаунт создан. Почтовый сервис временно недоступен; запросите письмо повторно в кабинете.'});}
    await session(user);return ok({redirect:'/dashboard'});
   }
   if(parts[1]==='login') {if(!existing||!await bcrypt.compare(password,existing.passwordHash))return fail('Неверный email или пароль');await session(existing);return ok({redirect:existing.role==='admin'?'/admin':'/dashboard'});}
  }
  if(route==='report') {
   await limit(`report:${ip}`,10,3600);const data=z.object({slug:z.string().max(150),message:z.string().trim().min(10).max(2000)}).parse(body);
   const listing=await listings.findOne({slug:data.slug,published:{$ne:null}});if(!listing)return fail('Объект не найден',404);
   await database.collection('reports').insertOne({listingId:listing._id,title:listing.published?.title,message:data.message,createdAt:new Date().toISOString(),resolved:false});return ok();
  }
  if(route==='event') {
   const data=z.object({id:z.string().max(100),type:z.enum(['view','phone','whatsapp','route'])}).parse(body);
   if(!await listings.findOne({_id:data.id,published:{$ne:null}}))return fail('Объект не найден',404);
   let visitor=(await cookies()).get('visitor')?.value;if(!visitor||!/^[-a-f0-9]{36}$/.test(visitor)){visitor=randomUUID();(await cookies()).set('visitor',visitor,{httpOnly:true,sameSite:'lax',secure:(process.env.APP_URL||'').startsWith('https:'),path:'/',maxAge:86400*30});}
   await limit(`events:${ip}`,600,60);
   const dedupe=hash(`${visitor}:${data.id}:${data.type}:${Math.floor(Date.now()/3600000)}`);
   await database.collection('events').updateOne({dedupe},{$setOnInsert:{dedupe,listingId:data.id,type:data.type,createdAt:new Date()}},{upsert:true});return ok();
  }
  const user=await requireUser();
  if(parts[0]==='listings') {
   await limit(`listing:${user._id}`,100,3600);
   const id=parts[1],action=parts[2]||'save';const existing=id&&id!=='new'?await listings.findOne({_id:id}):null;
   if(id!=='new'&&(!existing||(existing.ownerId!==user._id&&user.role!=='admin')))return fail('Объект не найден',404);
   const now=new Date().toISOString();
   if(action==='save') {
    const data=listingSchema.parse(body.data);const tax=await database.collection<Taxonomy>('taxonomy').find().toArray();
    if(!tax.some(t=>t.kind==='category'&&t._id===data.category)||data.amenities.some(a=>!tax.some(t=>t.kind==='amenity'&&t.name===a)))return fail('Проверьте категорию и удобства');
    for(const photo of data.photos)if(!await database.collection('photos').findOne({url:photo.url,...(user.role==='admin'?{}:{ownerId:user._id})})&&!existing?.draft.photos.some(p=>p.url===photo.url))return fail('Недоступное фото',403);
    if(existing){const result=await listings.updateOne({_id:existing._id,revision:body.revision},{$set:{draft:data,status:'draft',feedback:'',updatedAt:now},$inc:{revision:1}});if(!result.matchedCount)return fail('Карточка уже изменена. Обновите страницу.',409);return ok({id:existing._id,revision:existing.revision+1});}
    const newId=randomUUID();await listings.insertOne({_id:newId,slug:`place-${newId}`,ownerId:user._id,draft:data,published:null,status:'draft',feedback:'',confirmedAt:null,createdAt:now,updatedAt:now,revision:1});return ok({id:newId,revision:1});
   }
   if(!existing)return fail('Объект не найден',404);
   const match={_id:existing._id,revision:body.revision};
   let update:Record<string,unknown>={updatedAt:now};
   if(action==='submit'){if(!user.verified)return fail('Подтвердите email или номер телефона перед отправкой на проверку');listingSchema.parse(existing.draft);update={...update,status:'pending',feedback:''};}
   else if(action==='archive')update={...update,status:'archived',published:null};
   else if(action==='confirm'){if(!existing.published)return fail('Сначала опубликуйте объект');update={confirmedAt:now};}
   else if(['approve','reject','owner'].includes(action)) {
    if(user.role!=='admin')return fail('Нет доступа',403);
    if(action==='owner') {const contact=z.string().trim().min(3).parse(body.email);const owner=await users.findOne(contact.includes('@')?{email:z.email().parse(contact).toLowerCase()}:{phone:normalizePhone(contact)});if(!owner)return fail('Пользователь не найден');update={...update,ownerId:owner._id};}
    else {
     if(action==='approve'&&existing.status!=='pending')return fail('Карточка не находится на проверке');
     if(action==='approve'){listingSchema.parse(existing.draft);update={...update,published:existing.draft,status:'published',feedback:''};}
     else update={...update,status:'changes',feedback:z.string().trim().min(3).max(2000).parse(body.feedback)};
    }
   }else return fail('Неизвестное действие');
   const result=await listings.updateOne(match,{$set:update,$inc:{revision:1}});if(!result.matchedCount)return fail('Карточка уже изменена. Обновите страницу.',409);
   if(['approve','reject'].includes(action))await database.collection('revisions').insertOne({listingId:existing._id,data:existing.draft,previous:existing.published,result:action,comment:body.feedback||'',moderatorId:user._id,createdAt:now});
   return ok();
  }
  if(user.role!=='admin')return fail('Нет доступа',403);
  if(route==='admin/taxonomy') {const data=z.object({id:z.string().regex(/^[a-z0-9-]{2,60}$/),name:z.string().trim().min(2).max(80),kind:z.enum(['category','amenity']),order:z.number().int().min(0).max(100)}).parse(body);const collection=database.collection<Taxonomy>('taxonomy');const previous=await collection.findOne({_id:data.id});
   if(previous&&previous.kind!==data.kind)return fail('Тип существующего элемента изменить нельзя. Создайте новый элемент.');
   if(await collection.findOne({kind:data.kind,name:data.name,_id:{$ne:data.id}}))return fail('Такое название уже есть в справочнике');
   if(previous?.kind==='amenity'&&previous.name!==data.name){
    await listings.updateMany({'draft.amenities':previous.name},{$set:{'draft.amenities.$[entry]':data.name},$inc:{revision:1}},{arrayFilters:[{entry:previous.name}]});
    await listings.updateMany({'published.amenities':previous.name},{$set:{'published.amenities.$[entry]':data.name}},{arrayFilters:[{entry:previous.name}]});
   }
   await collection.updateOne({_id:data.id},{$set:{name:data.name,kind:data.kind,order:data.order}},{upsert:true});return ok();}
  if(route==='admin/article') {const data=articleSchema.parse(body);const col=database.collection<Article>('articles');const duplicate=await col.findOne({slug:data.slug});if(duplicate&&duplicate._id!==body.id)return fail('Этот URL уже занят');const id=typeof body.id==='string'&&body.id?body.id:randomUUID();const previous=await col.findOne({_id:id});const now=new Date().toISOString();
   const sourceList=data.sources||[];if(data.source&&!sourceList.some(s=>s.url===data.source))sourceList.unshift({label:'Основной источник',url:data.source});
   await col.updateOne({_id:id},{$set:{...data,sources:sourceList,updatedAt:now},$setOnInsert:{publishedAt:now},...(previous&&previous.cover!==data.cover?{$unset:{photoCredit:'' as const}}:{})},{upsert:true});return ok();}
  if(route==='admin/report') {const {ObjectId}=await import('mongodb');await database.collection('reports').updateOne({_id:new ObjectId(z.string().parse(body.id))},{$set:{resolved:true}});return ok();}
  return fail('Не найдено',404);
 }catch(error){
  if(error instanceof z.ZodError)return fail('Проверьте поля формы: '+error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));
  const message=error instanceof Error?error.message:'';
  const status=errorStatus(error);if(status&&message)return fail(message,status);
  if(message==='AUTH')return fail('Войдите в аккаунт',401);if(message==='FORBIDDEN')return fail('Нет доступа',403);
  if(message.startsWith('Слишком много'))return fail(message,429);
  console.error('API request failed',error instanceof Error?error.name:'unknown');return fail('Не удалось выполнить запрос. Попробуйте ещё раз.',500);
 }
}
export const GET=handle;export const POST=handle;
