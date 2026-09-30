import { SignJWT, jwtVerify } from 'jose';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { userError } from './auth';
import type { Otp, User } from './types';
export type PhonePurpose = 'signup' | 'login' | 'reset';
// Код живёт 5 минут, повторная отправка не чаще раза в минуту, 5 кодов в час на номер и 15 на IP, 5 попыток ввода.
const CODE_TTL=300000,COOLDOWN=60,PER_PHONE_HOUR=5,PER_IP_HOUR=15,MAX_ATTEMPTS=5,TOKEN_TTL='10m';
export function phoneSecret() {const key=process.env.PHONE_OTP_SECRET||process.env.SESSION_SECRET;if(!key||key.length<32)throw new Error('PHONE_OTP_SECRET или SESSION_SECRET должен содержать минимум 32 символа');return new TextEncoder().encode(key);}
// Номер Казахстана в E.164: +7 и десять цифр, начинающихся с 7. Принимаем запись через 8, пробелы и скобки.
export function normalizePhone(raw:unknown) {const digits=String(raw??'').replace(/\D/g,'');const local=digits.length===11&&(digits[0]==='7'||digits[0]==='8')?digits.slice(1):digits;if(!/^7\d{9}$/.test(local))throw userError('Введите номер Казахстана в формате +7 7XX XXX XX XX');return `+7${local}`;}
// PHONE_OTP_TEST_NUMBERS="+77010000001:123456,+77010000002:654321" — номера для приёмки: SMS не отправляется, код фиксирован, лимиты не применяются.
function testNumbers() {const map=new Map<string,string>();for(const entry of (process.env.PHONE_OTP_TEST_NUMBERS||'').split(',')){const [phone,code]=entry.split(':').map(s=>s.trim());if(phone&&/^\d{6}$/.test(code||''))map.set(phone,code);}return map;}
const codeHash=(phone:string,code:string)=>createHmac('sha256',phoneSecret()).update(`${phone}:${code}`).digest('hex');
// Отправка одной SMS через Mobizon (mobizon.kz). Без MOBIZON_API_KEY код печатается в консоль при разработке и отказ в production.
export async function sendSms(phone:string,text:string) {
 const key=process.env.MOBIZON_API_KEY;
 if(!key) {if(process.env.NODE_ENV==='production')throw userError('Отправка SMS не настроена на сервере.',503);console.log(`[dev] SMS ${phone}: ${text}`);return;}
 const base=(process.env.MOBIZON_API_URL||'https://api.mobizon.kz').replace(/\/+$/,'');
 const body=new URLSearchParams({recipient:phone.replace(/^\+/,''),text});if(process.env.MOBIZON_SENDER)body.set('from',process.env.MOBIZON_SENDER);
 const failed=()=>userError('Не удалось отправить SMS. Проверьте номер и попробуйте ещё раз.',502);
 const response=await fetch(`${base}/service/message/sendSmsMessage?output=json&api=v1&apiKey=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString(),signal:AbortSignal.timeout(10000)}).catch(()=>{throw failed();});
 const payload=await response.json().catch(()=>null) as {code?:number;message?:string}|null;
 if(!response.ok||payload?.code!==0) {console.error('Mobizon отклонил SMS',response.status,payload?.code,payload?.message);throw failed();}
}
// Проверяем пригодность номера до отправки: за SMS, которую следующий шаг всё равно отклонит, платить не нужно.
export async function sendPhoneCode(phone:string,ip:string,purpose:PhonePurpose) {
 const database=await db();const existing=await database.collection<User>('users').findOne({phone});
 if(purpose==='signup'&&existing)throw userError('Этот номер уже зарегистрирован. Войдите или восстановите пароль.');
 if(purpose!=='signup'&&!existing)throw userError('Аккаунт с этим номером не найден. Сначала зарегистрируйтесь.');
 const otps=database.collection<Otp>('otps');const test=testNumbers().get(phone);
 if(!test) {
  const last=await otps.find({phone}).sort({createdAt:-1}).limit(1).next();
  const wait=last?Math.ceil(COOLDOWN-(Date.now()-last.createdAt.getTime())/1000):0;
  if(wait>0)throw userError(`Код уже отправлен. Повторите через ${wait} с.`,429);
  const hourAgo=new Date(Date.now()-3600000);
  const [byPhone,byIp]=await Promise.all([otps.countDocuments({phone,createdAt:{$gt:hourAgo}}),otps.countDocuments({ip,createdAt:{$gt:hourAgo}})]);
  if(byPhone>=PER_PHONE_HOUR||byIp>=PER_IP_HOUR)throw userError('Слишком много запросов кода. Попробуйте через час.',429);
 }
 const code=test||randomInt(0,1000000).toString().padStart(6,'0');
 const row:Otp={_id:randomUUID(),phone,ip,codeHash:codeHash(phone,code),attempts:0,expiresAt:new Date(Date.now()+CODE_TTL),consumedAt:null,createdAt:new Date()};
 await otps.insertOne(row);
 // Сбой шлюза — наша проблема, а не пользователя: строка удаляется, чтобы не занимать часовой лимит номера.
 if(!test) try {await sendSms(phone,`Qarqaraly: код подтверждения ${code}. Никому не сообщайте его.`);} catch(error) {await otps.deleteOne({_id:row._id});throw error;}
 return {retryAfterSeconds:COOLDOWN};
}
// Сверяем код с последней невостребованной строкой и выдаём короткий токен «номер подтверждён».
export async function verifyPhoneCode(phone:string,code:string) {
 const otps=(await db()).collection<Otp>('otps');
 const row=await otps.find({phone,consumedAt:null}).sort({createdAt:-1}).limit(1).next();
 if(!row||row.expiresAt.getTime()<Date.now())throw userError('Срок действия кода истёк. Запросите новый.');
 if(row.attempts>=MAX_ATTEMPTS)throw userError('Слишком много неверных попыток. Запросите новый код.',429);
 const expected=Buffer.from(row.codeHash,'hex'),actual=Buffer.from(codeHash(phone,code),'hex');
 if(expected.length!==actual.length||!timingSafeEqual(expected,actual)) {
  const updated=await otps.findOneAndUpdate({_id:row._id},{$inc:{attempts:1}},{returnDocument:'after'});
  throw userError((updated?.attempts??MAX_ATTEMPTS)>=MAX_ATTEMPTS?'Слишком много неверных попыток. Запросите новый код.':'Неверный код.',(updated?.attempts??MAX_ATTEMPTS)>=MAX_ATTEMPTS?429:400);
 }
 await otps.updateOne({_id:row._id},{$set:{consumedAt:new Date()}});
 return new SignJWT({purpose:'phone'}).setProtectedHeader({alg:'HS256'}).setSubject(phone).setIssuedAt().setExpirationTime(TOKEN_TTL).sign(phoneSecret());
}
// Разбирает токен подтверждения обратно в номер, который он доказывает.
export async function phoneFromToken(token:unknown) {
 try {
  const {payload}=await jwtVerify(String(token??''),phoneSecret(),{algorithms:['HS256']});
  if(payload.purpose!=='phone'||typeof payload.sub!=='string')throw new Error('PHONE_TOKEN');
  return payload.sub;
 } catch {throw userError('Подтверждение номера недействительно или истекло. Запросите код заново.');}
}
