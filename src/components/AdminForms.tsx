'use client';
import { useTranslator } from '@/components/LocaleProvider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { Listing, Article, Taxonomy } from '@/lib/types';
import PhoneInput from './PhoneInput';
export function Moderation({listing}:{listing:Listing}) {
 const translate=useTranslator();
 const router=useRouter();
 const [feedback,setFeedback]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState('');
 const [ownerContactType,setOwnerContactType]=useState<'phone'|'email'>('phone');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const ownerContact=ownerContactType==='phone'?phone:email.trim();
 async function act(action:string) {
  setBusy(true);setError('');
  try {
   await api(`listings/${listing._id}/${action}`,{revision:listing.revision,feedback,email:ownerContact});
   router.refresh();
  } catch(e) {setError((e as Error).message);} finally {setBusy(false);}
 }
 return <div className="admin-controls">
  <label>{translate("Комментарий модератора")}<textarea value={feedback} onChange={e=>setFeedback(e.target.value)} maxLength={2000} placeholder={translate("Что нужно исправить?")}/></label>
  <div className="form-actions">
   {listing.status==='pending'&&<button className="button small" disabled={busy} onClick={()=>act('approve')}>{translate("Опубликовать")}</button>}
   <button className="button secondary small" disabled={busy||feedback.trim().length<3} onClick={()=>act('reject')}>{translate("Вернуть на исправление")}</button>
   {listing.published&&<button className="button secondary small" disabled={busy} onClick={()=>act('archive')}>{translate("Скрыть объект")}</button>}
  </div>
  <details>
   <summary>{translate("Назначить владельца после проверки")}</summary>
   <form style={{display:'grid',gap:12,marginTop:12}} onSubmit={event=>{event.preventDefault();if(!busy)void act('owner');}}>
    <label>{translate("Найти владельца по")}
     <select value={ownerContactType} disabled={busy} onChange={event=>{setOwnerContactType(event.target.value as 'phone'|'email');setError('');}}>
      <option value="phone">{translate("Телефон")}</option><option value="email">Email</option>
     </select>
    </label>
    {ownerContactType==='phone'
     ?<label>{translate("Телефон")}<PhoneInput name="phone" value={phone} onValueChange={setPhone} required disabled={busy} autoComplete="off"/></label>
     :<label>Email<input name="email" type="email" placeholder="you@example.com" value={email} onChange={event=>setEmail(event.target.value)} required disabled={busy} maxLength={254} autoComplete="off"/></label>}
    <button type="submit" className="button secondary small" disabled={busy||!ownerContact}>{translate("Назначить владельца")}</button>
   </form>
  </details>
  {error&&<p role="alert" className="error-message">{translate(error)}</p>}
 </div>;
}
export function TaxonomyForm({item}:{item?:Taxonomy}){const translate=useTranslator();const router=useRouter();const [error,setError]=useState(''),[busy,setBusy]=useState(false);return <form className="form-card" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const form=e.currentTarget;const values=Object.fromEntries(new FormData(form));try{await api('admin/taxonomy',{...values,order:Number(values.order)});if(!item)form.reset();router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><h3>{translate(item?'Изменить справочник':'Новая категория / удобство')}</h3><div className="form-grid"><label>{translate("ID (латиница)")}<input name="id" pattern="[a-z0-9-]{2,60}" required defaultValue={item?._id} readOnly={!!item}/></label><label>{translate("Название")}<input name="name" required minLength={2} maxLength={80} defaultValue={item?.name}/></label><label>{translate("Тип")}<select name="kind" defaultValue={item?.kind||'category'}><option value="category">{translate("Категория")}</option><option value="amenity">{translate("Удобство")}</option></select></label><label>{translate("Порядок")}<input name="order" type="number" min="0" max="100" required defaultValue={item?.order||0}/></label></div>{translate(error&&<p className="error-message" role="alert">{translate(error)}</p>)}<button className="button secondary" disabled={busy}>{translate("Сохранить")}</button></form>;}
export function ArticleForm({article}:{article?:Article}){const translate=useTranslator();const router=useRouter();const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[cover,setCover]=useState(article?.cover||'');return <form className="form-card" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setMessage('');const values=Object.fromEntries(new FormData(e.currentTarget));try{await api('admin/article',{...values,cover,id:article?._id,sources:String(values.sources||'').split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{const split=line.indexOf(' | ');return split<0?{label:line,url:line}:{label:line.slice(0,split),url:line.slice(split+3)};}),published:values.published==='on'});setMessage('Статья сохранена');router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><h2>{translate(article?'Редактирование материала':'Новый материал')}</h2><div className="form-grid"><label>{translate("Тип материала")}<select name="kind" defaultValue={article?.kind||'guide'}><option value="guide">{translate("Статья путеводителя")}</option><option value="news">{translate("Новость")}</option></select></label><label>{translate("Раздел путеводителя")}<select name="section" defaultValue={article?.section||'tips'}><option value="sights">{translate("Достопримечательности")}</option><option value="routes">{translate("Маршруты")}</option><option value="tips">{translate("Советы туристам")}</option></select></label></div><label>{translate("Дата сообщения источника (для новостей)")}<input type="date" name="sourcePublishedAt" defaultValue={article?.sourcePublishedAt||''}/></label><label>{translate("Заголовок")}<input name="title" required minLength={5} maxLength={180} defaultValue={article?.title}/></label><label>{translate("URL (латиница и дефисы)")}<input name="slug" required pattern="[a-z0-9-]{3,100}" defaultValue={article?.slug}/></label><label>{translate("Краткое описание")}<textarea name="summary" required minLength={10} maxLength={500} defaultValue={article?.summary}/></label><p className="form-help">{translate("Подзаголовки начинайте с ## и отделяйте пустой строкой. Каждый абзац также отделяйте пустой строкой.")}</p><label>{translate("Текст")}<textarea name="body" required minLength={30} maxLength={40000} rows={12} defaultValue={article?.body}/></label><label>{translate("Обложка")}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);setError('');try{const form=new FormData();form.set('file',file);const response=await fetch('/api/upload',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw new Error(result.error);setCover(result.url);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}/></label>{translate(cover&&<div><img src={cover} alt={translate("Обложка")} style={{maxHeight:180}}/><button className="button secondary small" type="button" onClick={()=>setCover('')}>{translate("Убрать обложку")}</button></div>)}<div className="form-grid"><label>{translate("Источник")}<input name="source" type="url" defaultValue={article?.source} placeholder="https://…"/></label><label>{translate("Дата проверки")}<input name="checkedAt" type="date" defaultValue={article?.checkedAt}/></label></div><label>{translate("Дополнительные источники")}<textarea name="sources" rows={4} defaultValue={article?.sources?.map(s=>`${s.label} | ${s.url}`).join("\n")||''} placeholder={translate("Название источника | https://…")}/><span className="form-help">{translate("Один источник на строку. Основной источник также будет показан.")}</span></label><p className="form-help">{translate("Для публикации обязательны источник и дата проверки; для новости — дата сообщения источника.")}</p><label className="checkbox"><input name="published" type="checkbox" defaultChecked={article?.published}/>{translate("Опубликовать")}</label>{translate(error&&<p role="alert" className="error-message">{translate(error)}</p>)}{translate(message&&<p role="status" className="notice">{translate(message)}</p>)}<button className="button" disabled={busy}>{translate("Сохранить статью")}</button></form>;}
export function ResolveReport({id}:{id:string}) {const translate=useTranslator();const router=useRouter();const [error,setError]=useState('');return <><button className="button secondary small" onClick={async()=>{try{await api('admin/report',{id});router.refresh();}catch(e){setError((e as Error).message);}}}>{translate("Отметить обработанным")}</button>{translate(error&&<p role="alert">{translate(error)}</p>)}</>;}
