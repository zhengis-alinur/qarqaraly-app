'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
// Вход по email оставлен только для администратора: /auth/login?email=1.
// Публичная регистрация, подтверждение почты и восстановление по письму убраны — они идут через SMS.
export default function EmailLogin() {const router=useRouter();const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <div className="auth-wrap"><form className="form-card" onSubmit={async e=>{e.preventDefault();setError('');setBusy(true);const fields=Object.fromEntries(new FormData(e.currentTarget));try{const result=await api('auth/login',fields);if(result.redirect){router.push(result.redirect);router.refresh();}}catch(problem){setError((problem as Error).message);}finally{setBusy(false);}}}>
  <span className="eyebrow">СЛУЖЕБНЫЙ ВХОД</span>
  <div><h1>Вход по email</h1><p>Для администратора. Владельцы объектов входят по номеру телефона.</p></div>
  <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com"/></label>
  <label>Пароль<input name="password" type="password" minLength={10} maxLength={72} required autoComplete="current-password" placeholder="Не менее 10 символов"/></label>
  {error&&<p className="error-message" role="alert">{error}</p>}
  <button className="button" disabled={busy}>{busy?'Подождите…':'Войти'}</button>
  <div className="auth-links"><Link href="/auth/login">Войти по номеру телефона</Link></div>
 </form></div>;
}
