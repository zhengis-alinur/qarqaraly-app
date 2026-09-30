'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
export function AuthTabs({value,onChange}:{value:'email'|'phone';onChange:(tab:'email'|'phone')=>void}) {return <div className="auth-tabs" role="tablist">{([['email','Email'],['phone','Телефон']] as const).map(([key,label])=><button key={key} type="button" role="tab" aria-selected={value===key} className={value===key?'active':''} onClick={()=>onChange(key)}>{label}</button>)}</div>;}
const purposes:Record<string,string>={register:'signup',login:'login',forgot:'reset'};
const endpoints:Record<string,string>={register:'auth/phone-register',login:'auth/phone-login',forgot:'auth/phone-reset'};
const titles:Record<string,string>={login:'С возвращением',register:'Расскажите о своём месте',forgot:'Восстановить пароль'};
// Вход и регистрация по номеру: отправка кода → ввод кода → пароль (для регистрации и восстановления).
export default function PhoneAuth({mode,onEmail}:{mode:string;onEmail:()=>void}) {
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
 if(step==='done') return <div className="form-card"><h1>{titles[mode]}</h1><div className="notice" role="status">{message}</div><Link className="button" href="/auth/login">Перейти ко входу</Link></div>;
 return <form className="form-card" onSubmit={submit}>
  <span className="eyebrow">КАБИНЕТ МЕСТНОГО БИЗНЕСА</span>
  <div><h1>{titles[mode]}</h1><p>{mode==='register'?'Подтвердите номер телефона по SMS и создайте аккаунт.':mode==='forgot'?'Подтвердите номер телефона по SMS и задайте новый пароль.':'Войдите по номеру телефона.'}</p></div>
  <AuthTabs value="phone" onChange={tab=>{if(tab==='email')onEmail();}}/>
  {step==='phone'&&<label>Номер телефона<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={e=>setPhone(e.target.value)} maxLength={20} placeholder="+7 701 234 56 78"/></label>}
  {step==='phone'&&byPassword&&<label>Пароль<input name="password" type="password" minLength={10} maxLength={72} required autoComplete="current-password" placeholder="Не менее 10 символов"/></label>}
  {step==='code'&&<><p>Код отправлен на {phone}. Он действует пять минут.</p><label>Код из SMS<input name="code" className="code-input" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="______"/></label><div className="form-actions"><button type="button" className="button secondary small" disabled={busy||wait>0} onClick={resend}>{wait>0?`Отправить повторно через ${wait} с`:'Отправить код повторно'}</button><button type="button" className="button secondary small" onClick={()=>{setStep('phone');setError('');}}>Изменить номер</button></div></>}
  {step==='password'&&<label>{mode==='forgot'?'Новый пароль':'Пароль'}<input name="password" type="password" minLength={10} maxLength={72} required autoComplete="new-password" placeholder="Не менее 10 символов"/></label>}
  {step==='password'&&mode==='register'&&<label className="checkbox"><input type="checkbox" required/><span>Я ознакомился с <Link href="/privacy" target="_blank" style={{textDecoration:'underline'}}>политикой конфиденциальности</Link></span></label>}
  {error&&<p className="error-message" role="alert">{error}</p>}
  <button className="button" disabled={busy}>{busy?'Подождите…':step==='phone'?(byPassword?'Войти':'Получить код'):step==='code'?'Подтвердить номер':mode==='register'?'Создать аккаунт':'Сохранить пароль'}</button>
  <div className="auth-links">
   {mode==='login'&&step==='phone'&&<button type="button" className="text-link" onClick={()=>{setByPassword(!byPassword);setError('');}}>{byPassword?'Войти по коду из SMS':'Войти по паролю'}</button>}
   <Link href={mode==='login'?'/auth/register':'/auth/login'}>{mode==='login'?'Создать аккаунт':'Уже есть аккаунт? Войти'}</Link>
   {mode!=='forgot'&&<Link href="/auth/forgot">Забыли пароль?</Link>}
  </div>
 </form>;
}
