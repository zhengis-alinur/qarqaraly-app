import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { db } from './db';
import type { User } from './types';
export function secret() { const key=process.env.SESSION_SECRET; if(!key || key.length<32) throw new Error('SESSION_SECRET должен содержать минимум 32 символа'); return new TextEncoder().encode(key); }
export async function currentUser() {
 const token=(await cookies()).get('session')?.value; if(!token)return null;
 try {const {payload}=await jwtVerify(token,secret(),{algorithms:['HS256']}); const u=await (await db()).collection<User>('users').findOne({_id:payload.sub}); return u && u.sessionVersion===payload.ver ? u : null;} catch{return null;}
}
export async function requireUser(admin=false) { const user=await currentUser(); if(!user)throw new Error('AUTH'); if(admin && user.role!=='admin')throw new Error('FORBIDDEN');return user; }
export async function session(user:User) {const token=await new SignJWT({ver:user.sessionVersion}).setProtectedHeader({alg:'HS256'}).setSubject(user._id).setIssuedAt().setExpirationTime('7d').sign(secret()); (await cookies()).set('session',token,{httpOnly:true,secure:(process.env.APP_URL||'').startsWith('https:'),sameSite:'lax',path:'/',maxAge:604800});}
export const hash = (text:string)=>createHash('sha256').update(text).digest('hex');
// Ошибка с полем status показывается пользователю как есть; остальное маршрут прячет за общим сообщением.
export const userError=(message:string,status=400)=>Object.assign(new Error(message),{status});
export const errorStatus=(error:unknown)=>typeof error==='object'&&error!==null&&typeof (error as {status?:unknown}).status==='number'?(error as {status:number}).status:null;
export async function limit(key:string,max=10,seconds=900) {
 const bucket=Math.floor(Date.now()/(seconds*1000));
 const limits=(await db()).collection<{_id:string;count:number;expiresAt:Date}>('limits');
 const value=await limits.findOneAndUpdate({_id:hash(`${key}:${bucket}`)},{$inc:{count:1},$setOnInsert:{expiresAt:new Date(Date.now()+seconds*2000)}},{upsert:true,returnDocument:'after'});
 if(value && value.count>max) throw new Error('Слишком много попыток. Попробуйте позже.');
}
export async function sendToken(user:User,purpose:'verify'|'reset') {
 if(!user.email) throw new Error('У аккаунта нет email: восстановление и подтверждение доступны по номеру телефона.');
 const raw=randomBytes(32).toString('hex'); const tokens=(await db()).collection('tokens');
 await tokens.insertOne({hash:hash(raw),userId:user._id,purpose,expiresAt:new Date(Date.now()+3600000),used:false});
 const link=`${process.env.APP_URL || 'http://localhost:3000'}/auth/${purpose}?token=${raw}`;
 const mail=nodemailer.createTransport({host:process.env.SMTP_HOST || 'localhost',port:Number(process.env.SMTP_PORT||1025),secure:process.env.SMTP_SECURE==='true',...(process.env.SMTP_USER ? {auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}} : {})});
 await mail.sendMail({from:process.env.MAIL_FROM || 'Qarqaraly <noreply@localhost>',to:user.email,subject:purpose==='verify'?'Подтвердите почту — Qarqaraly':'Восстановление пароля — Qarqaraly',text:`${purpose==='verify'?'Подтвердите почту':'Установите новый пароль'}: ${link}\nСсылка действует один час. Если вы не запрашивали письмо, просто проигнорируйте его.`});
}
