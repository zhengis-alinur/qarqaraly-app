'use client';
import { useTranslator } from '@/components/LocaleProvider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
export function Logout(){const translate=useTranslator();const router=useRouter();const [error,setError]=useState('');return <><button className="button secondary small" onClick={async()=>{try{await api('auth/logout',{});router.push('/');router.refresh();}catch(e){setError((e as Error).message);}}}>{translate("Выйти")}</button>{translate(error&&<p role="alert">{translate(error)}</p>)}</>;}
export function ListingAction({id,revision,action,label}:{id:string;revision:number;action:string;label:string}){const translate=useTranslator();const router=useRouter();const [error,setError]=useState(''),[busy,setBusy]=useState(false);return <div><button className="button secondary small" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await api(`listings/${id}/${action}`,{revision});router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{translate(busy?'Подождите…':label)}</button>{translate(error&&<p className="error-message" role="alert">{translate(error)}</p>)}</div>;}
