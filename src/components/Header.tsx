'use client';
import { useTranslator } from '@/components/LocaleProvider';

import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, X, ArrowUpRight, UserRound, ChevronDown, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/client';
export default function Header({signedIn=false,admin=false}:{signedIn?:boolean;admin?:boolean}) {const translate=useTranslator();
 const pathname=usePathname(),router=useRouter();
 const [open,setOpen]=useState(false),[account,setAccount]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const menu=useRef<HTMLDivElement>(null);
 const parent=pathname.startsWith('/places/')?'/catalog':pathname.startsWith('/guide/')?'/guide':pathname.startsWith('/news/')?'/news':pathname.startsWith('/dashboard/')?'/dashboard':null;
 // Попап закрывается щелчком вне него и клавишей Escape.
 useEffect(()=>{
  if(!account)return;
  const away=(e:MouseEvent)=>{if(!menu.current?.contains(e.target as Node))setAccount(false);};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setAccount(false);};
  document.addEventListener('mousedown',away);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('mousedown',away);document.removeEventListener('keydown',escape);};
 },[account]);
 useEffect(()=>{setAccount(false);setOpen(false);},[pathname]);
 async function logout() {setBusy(true);setError('');try{await api('auth/logout',{});setAccount(false);router.push('/');router.refresh();}catch(problem){setError((problem as Error).message);}finally{setBusy(false);}}
 return <header className="site-header"><div className="container header-inner">
  {parent&&<Link href={parent} className="mobile-back icon-button" aria-label={translate('Назад')}><ChevronLeft size={22}/></Link>}
  <Link href="/" className="brand" onClick={()=>setOpen(false)} aria-label={translate("Қарқаралы — главная")}><img className="brand-image" src="/brand/qarqaraly-logo.webp" alt={translate("Қарқаралы")} width={2172} height={724}/></Link>
  <nav className="desktop-nav" aria-label={translate("Основная навигация")}>{translate([['/catalog','Места и услуги'],['/map','Карта'],['/sights','Что посмотреть'],['/guide','Путеводитель'],['/news','Новости']].map(([href,title])=><Link className={pathname.startsWith(href)?'active':''} href={href} key={href}>{translate(title)}</Link>))}</nav>
  <div className="header-actions"><LanguageSwitcher/>
   {translate(signedIn?<div className="account-menu" ref={menu}>
    <button type="button" className="account-link" aria-label={translate("Профиль")} aria-haspopup="menu" aria-expanded={account} aria-controls="account-popup" onClick={()=>setAccount(!account)}><UserRound size={18}/><span>{translate("Профиль")}</span><ChevronDown size={15} aria-hidden/></button>
    {translate(account&&<div className="account-popup" id="account-popup" role="menu">
     <Link role="menuitem" href={admin?'/admin':'/dashboard'}>{translate(admin?'Администрирование':'Мой кабинет')}</Link>
     <Link role="menuitem" href="/dashboard/new">{translate("Добавить объект")}</Link>
     <button type="button" role="menuitem" className="account-logout" disabled={busy} onClick={logout}>{translate(busy?'Выходим…':'Выйти')}</button>
     {translate(error&&<p className="error-message" role="alert">{translate(error)}</p>)}
    </div>)}
   </div>:<Link className="account-link" href="/auth/login" aria-label={translate("Войти")}><UserRound size={18}/><span>{translate("Войти")}</span></Link>)}
   <Link className="button small desktop-cta" href="/dashboard/new">{translate("Разместить бизнес ")}<ArrowUpRight size={16}/></Link>
   <button className="icon-button menu-toggle" aria-label={translate(open?'Закрыть меню':'Открыть меню')} aria-expanded={open} aria-controls="mobile-menu" onClick={()=>setOpen(!open)}>{translate(open?<X/>:<Menu/>)}</button>
  </div>
 </div>
 {translate(open&&<nav id="mobile-menu" className="mobile-menu" aria-label={translate("Мобильная навигация")}>{translate([['/','Главная'],['/catalog','Места и услуги'],['/map','Карта'],['/sights','Что посмотреть'],['/guide','Путеводитель'],['/news','Новости'],[admin?'/admin':'/dashboard','Мой кабинет'],['/dashboard/new','Разместить бизнес']].map(([href,title])=><Link href={href} key={href} onClick={()=>setOpen(false)}>{translate(title)}<ArrowUpRight size={18}/></Link>))}</nav>)}
 </header>;
}
