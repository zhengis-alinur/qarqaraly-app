'use client';
import { useTranslator } from '@/components/LocaleProvider';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
const purposes:Record<string,string>={register:'signup',login:'login',forgot:'reset'};
const endpoints:Record<string,string>={register:'auth/phone-register',login:'auth/phone-login',forgot:'auth/phone-reset'};
const titles:Record<string,string>={login:'С возвращением',register:'Расскажите о своём месте',forgot:'Восстановить пароль'};
// Вход и регистрация по номеру: отправка кода → ввод кода → пароль (для регистрации и восстановления).
export default function PhoneAuth({mode}:{mode:string}) {const translate=useTranslator();
 const router=useRouter();
 const [step,setStep]=useState<'phone'|'code'|'password'|'done'>('phone');
 const [phone,setPhone]=useState('+7'),[code,setCode]=useState(''),[token,setToken]=useState(''),[byPassword,setByPassword]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[wait,setWait]=useState(0);
 useEffect(()=>{if(wait<=0)return;const timer=setTimeout(()=>setWait(wait-1),1000);return()=>clearTimeout(timer);},[wait]);
 const finish=(result:{redirect?:string;message?:string})=>{if(result.redirect){router.push(result.redirect);router.refresh();}else{setMessage(result.message||'Готово');setStep('done');}};
 async function submit(e:React.FormEvent<HTMLFormElement>) {
  e.preventDefault();setError('');setBusy(true);
  const password=String(new FormData(e.currentTarget).get('password')||'');
  try {
   if(step==='phone'&&byPassword) finish(await api('auth/phone/password',{phone,password}));
   else if(step==='phone') {const result=await api('auth/phone/send-code',{phone,purpose:purposes[mode]});setWait(result.retryAfterSeconds||60);setCode('');setStep('code');}
   else if(step==='code') {
    const result=await api('auth/phone/verify-code',{phone,code});setToken(result.token);
    if(mode==='login') finish(await api('auth/phone-login',{token:result.token}));else setStep('password');
   }
   else finish(await api(endpoints[mode],{token,password}));
  } catch(problem) {setError((problem as Error).message);} finally {setBusy(false);}
 }
 async function resend() {setError('');setBusy(true);try{const result=await api('auth/phone/send-code',{phone,purpose:purposes[mode]});setWait(result.retryAfterSeconds||60);}catch(problem){setError((problem as Error).message);}finally{setBusy(false);}}
 if(step==='done') return <div className="auth-wrap"><div className="form-card"><h1>{translate(titles[mode])}</h1><div className="notice" role="status">{translate(message)}</div><Link className="button" href="/auth/login">{translate("Перейти ко входу")}</Link></div></div>;
 return <div className="auth-wrap"><form className="form-card" onSubmit={submit}>
  <span className="eyebrow">{translate("КАБИНЕТ МЕСТНОГО БИЗНЕСА")}</span>
  <div><h1>{translate(titles[mode])}</h1><p>{translate(mode==='register'?'Подтвердите номер телефона по SMS и создайте аккаунт.':mode==='forgot'?'Подтвердите номер телефона по SMS и задайте новый пароль.':'Войдите по номеру телефона.')}</p></div>
  {translate(step==='phone'&&<label>{translate("Номер телефона")}<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={e=>setPhone(e.target.value)} maxLength={20} placeholder="+7 701 234 56 78"/></label>)}
  {translate(step==='phone'&&byPassword&&<label>{translate("Пароль")}<input name="password" type="password" minLength={10} maxLength={72} required autoComplete="current-password" placeholder={translate("Не менее 10 символов")}/></label>)}
  {translate(step==='code'&&<><p>{translate("Код отправлен на ")}{translate(phone)}{translate(". Он действует пять минут.")}</p><label>{translate("Код из SMS")}<input name="code" className="code-input" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="______"/></label><div className="form-actions"><button type="button" className="button secondary small" disabled={busy||wait>0} onClick={resend}>{translate(wait>0?`Отправить повторно через ${wait} с`:'Отправить код повторно')}</button><button type="button" className="button secondary small" onClick={()=>{setStep('phone');setError('');}}>{translate("Изменить номер")}</button></div></>)}
  {translate(step==='password'&&<label>{translate(mode==='forgot'?'Новый пароль':'Пароль')}<input name="password" type="password" minLength={10} maxLength={72} required autoComplete="new-password" placeholder={translate("Не менее 10 символов")}/></label>)}
  {translate(step==='password'&&mode==='register'&&<label className="checkbox"><input type="checkbox" required/><span>{translate("Я ознакомился с ")}<Link href="/privacy" target="_blank" style={{textDecoration:'underline'}}>{translate("политикой конфиденциальности")}</Link></span></label>)}
  {translate(error&&<p className="error-message" role="alert">{translate(error)}</p>)}
  <button className="button" disabled={busy}>{translate(busy?'Подождите…':step==='phone'?(byPassword?'Войти':'Получить код'):step==='code'?'Подтвердить номер':mode==='register'?'Создать аккаунт':'Сохранить пароль')}</button>
  <div className="auth-links">
   {translate(mode==='login'&&step==='phone'&&<button type="button" className="text-link" onClick={()=>{setByPassword(!byPassword);setError('');}}>{translate(byPassword?'Войти по коду из SMS':'Войти по паролю')}</button>)}
   <Link href={mode==='login'?'/auth/register':'/auth/login'}>{translate(mode==='login'?'Создать аккаунт':'Уже есть аккаунт? Войти')}</Link>
   {translate(mode!=='forgot'&&<Link href="/auth/forgot">{translate("Забыли пароль?")}</Link>)}
  </div>
 </form></div>;
}
