'use client';
import { useTranslator } from '@/components/LocaleProvider';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Send, Upload, Trash2, ArrowUp, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { api } from '@/lib/client';
import { categoryFields } from '@/lib/categories';
import { emptyListing, statusLabels, type Listing, type ListingData, type PaymentClaim, type Taxonomy } from '@/lib/types';
import type { PaymentConfig } from '@/lib/payment';
import Payment from './Payment';
import MapView from './MapView';
/**
 * Заявка заполняется в два шага: сведения об объекте, затем оплата. Отправить на проверку можно
 * только после того, как владелец подтвердил оплату кнопкой «Я оплатил» — это заявление с его слов,
 * подтверждения от банка сайт не получает. Состав полей первого шага зависит от категории.
 */
export default function ListingForm({listing,tax,verified,payment,claim}:{listing?:Listing;tax:Taxonomy[];verified:boolean;payment:PaymentConfig;claim?:PaymentClaim}) {const translate=useTranslator();
 const router=useRouter();
 const [data,setData]=useState<ListingData>(listing?.draft||emptyListing);
 const [id,setId]=useState(listing?._id||'new');
 const [revision,setRevision]=useState(listing?.revision||0);
 const [step,setStep]=useState<'info'|'pay'>('info');
 const [payer,setPayer]=useState(claim?.payerName||'');
 const [paidAt,setPaidAt]=useState(claim?.claimedAt||'');
 const [busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const point=useMemo<[number,number]|undefined>(()=>data.lat!==null&&data.lng!==null?[data.lat,data.lng]:undefined,[data.lat,data.lng]);
 const update=<K extends keyof ListingData>(key:K,value:ListingData[K])=>setData(old=>({...old,[key]:value}));
 const fields=categoryFields(data.category);
 const payable=Boolean(payment.qr||payment.link);
 // Смена категории подтягивает единицу стоимости и очищает поля, которых у этой категории нет.
 function changeCategory(category:string) {
  const next=categoryFields(category);
  setData(old=>({...old,category,priceUnit:next.priceUnit,price:next.price?old.price:null,amenities:next.amenities?old.amenities:[],conditions:next.conditions?old.conditions:''}));
 }
 async function persist() {const result=await api(`listings/${id}/save`,{data,revision});setId(result.id);setRevision(result.revision);return result as {id:string;revision:number};}
 async function run(action:()=>Promise<void>) {setBusy(true);setError('');setMessage('');try{await action();}catch(problem){setError((problem as Error).message);}finally{setBusy(false);}}
 const saveDraft=()=>run(async()=>{const result=await persist();setMessage('Черновик сохранён. Для публикации пройдите шаг оплаты и отправьте заявку на проверку.');if(id==='new')router.replace(`/dashboard/${result.id}`);router.refresh();});
 const toPayment=(form:HTMLFormElement|null)=>{if(form&&!form.reportValidity())return;void run(async()=>{const result=await persist();if(id==='new')router.replace(`/dashboard/${result.id}`);setStep('pay');});};
 const markPaid=()=>run(async()=>{
  if(payer.trim().length<3){setError('Укажите, от кого поступит оплата');return;}
  const result=await persist();
  const paid=await api(`listings/${result.id}/paid`,{revision:result.revision,payerName:payer});
  setRevision(paid.revision??result.revision+1);setPaidAt(new Date().toISOString());
  setMessage('Спасибо! Отметили оплату. Теперь отправьте заявку на проверку.');
 });
 const submit=()=>run(async()=>{const result=await persist();await api(`listings/${result.id}/submit`,{revision:result.revision});router.push('/dashboard');router.refresh();});
 return <form onSubmit={e=>{e.preventDefault();void saveDraft();}} className="form-card">
  <div>
   <span className="eyebrow">{translate(listing?statusLabels[listing.status]:'НОВОЕ МЕСТО')}</span>
   <h1 style={{fontSize:32,margin:'12px 0'}}>{translate("Расскажите о вашем объекте")}</h1>
   <p className="form-help">{translate("Первая фотография станет обложкой. Изменения опубликованной карточки появятся после модерации.")}</p>
  </div>
  {translate(payable&&<ol className="form-steps"><li className={step==='info'?'active':''}>{translate("1. Информация")}</li><li className={step==='pay'?'active':''}>{translate("2. Оплата")}</li></ol>)}
  {translate(listing?.feedback&&<div className="notice warning">{translate("Комментарий модератора: ")}{translate(listing.feedback)}</div>)}
  {translate(!verified&&<div className="notice warning">{translate("Черновик можно сохранить сейчас. Для отправки на проверку подтвердите номер телефона.")}</div>)}
  {translate(step==='info'&&<>
   <section className="form-section"><h2>{translate("Основная информация")}</h2><div className="form-grid">
    <label>{translate("Название *")}<input value={data.title} onChange={e=>update('title',e.target.value)} required minLength={3} maxLength={120} placeholder={translate("Название вашего места")}/></label>
    <label>{translate("Категория *")}<select value={data.category} onChange={e=>changeCategory(e.target.value)}>{translate(tax.filter(t=>t.kind==='category').map(c=><option key={c._id} value={c._id}>{translate(c.name)}</option>))}</select></label>
    <label className="full-width">{translate("Описание *")}<textarea value={data.description} onChange={e=>update('description',e.target.value)} required minLength={30} maxLength={10000} rows={6} placeholder={translate("Чем интересно ваше место и что ждёт гостей? Минимум 30 символов.")}/></label>
    <label className="full-width">{translate("Адрес *")}<input value={data.address} onChange={e=>update('address',e.target.value)} required minLength={3} maxLength={300}/></label>
    {translate(fields.price&&<><label>{translate("Стоимость, ₸")}<input type="number" min="0" max="100000000" value={data.price??''} onChange={e=>update('price',e.target.value===''?null:Number(e.target.value))} placeholder={translate("Не указана")}/><span className="form-help">{translate("Оставьте пустым, если цену нужно уточнять.")}</span></label>
    <label>{translate("Единица стоимости")}<select value={data.priceUnit} onChange={e=>update('priceUnit',e.target.value)}>{translate(['за ночь','за человека','за час','за услугу'].map(u=><option key={u}>{translate(u)}</option>))}</select></label></>)}
   </div></section>
   <section className="form-section"><h2>{translate("Фотографии")}</h2><p>{translate("До 10 фотографий, JPG / PNG / WebP, до 10 МБ каждая.")}</p>
    <label className="file-input"><span><Upload size={16}/> {translate(uploading?'Загружаем фотографии…':'Выбрать фотографии')}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading||data.photos.length>=10} onChange={async e=>{const files=Array.from(e.target.files||[]);e.target.value='';if(data.photos.length+files.length>10){setError('Можно добавить не больше 10 фотографий');return;}setUploading(true);setError('');try{for(const file of files){if(file.size>10*1024*1024)throw new Error('Фотография превышает 10 МБ');const form=new FormData();form.set('file',file);const response=await fetch('/api/upload',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw new Error(result.error);setData(old=>({...old,photos:[...old.photos,{url:result.url,caption:''}]}));}}catch(problem){setError((problem as Error).message);}finally{setUploading(false);}}}/></label>
    <div className="photo-editor">{translate(data.photos.map((p,i)=><div className="photo-edit" key={p.url}><img src={p.url} alt={translate(p.caption||`Фото ${i+1}`)}/><input aria-label={translate(`Подпись к фото ${i+1}`)} placeholder={translate("Подпись к фотографии")} value={p.caption} maxLength={200} onChange={e=>update('photos',data.photos.map((photo,j)=>j===i?{...photo,caption:e.target.value}:photo))}/><div className="photo-controls"><button className="button secondary" type="button" disabled={i===0} onClick={()=>update('photos',[p,...data.photos.filter((_,j)=>j!==i)])}><ArrowUp size={12}/>{translate(i===0?'Обложка':'На обложку')}</button><button className="button secondary" type="button" aria-label={translate(`Удалить фото ${i+1}`)} onClick={()=>update('photos',data.photos.filter((_,j)=>j!==i))}><Trash2 size={13}/></button></div></div>))}</div>
   </section>
   {translate((fields.amenities||fields.conditions)&&<section className="form-section"><h2>{translate("Удобства и условия")}</h2><div className="form-grid">
    {translate(fields.amenities&&<fieldset className="full-width"><legend>{translate("Что есть у вас?")}</legend><div className="amenity-tags">{translate(tax.filter(t=>t.kind==='amenity').map(a=><label className="checkbox" key={a._id}><input type="checkbox" checked={data.amenities.includes(a.name)} onChange={e=>update('amenities',e.target.checked?[...data.amenities,a.name]:data.amenities.filter(x=>x!==a.name))}/>{translate(a.name)}</label>))}</div></fieldset>)}
    {translate(fields.conditions&&<label>{translate("Условия посещения / проживания")}<textarea value={data.conditions} onChange={e=>update('conditions',e.target.value)} maxLength={5000} placeholder={translate("Время заезда, правила, ограничения")}/></label>)}
    <label>{translate("Время работы и сезонность")}<textarea value={data.hours} onChange={e=>update('hours',e.target.value)} maxLength={500} placeholder={translate("Дни и часы работы")}/></label>
   </div></section>)}
   <section className="form-section"><h2>{translate("Контакты")}</h2><div className="form-grid">
    <label>{translate("Телефон")}<input type="tel" value={data.phone} onChange={e=>update('phone',e.target.value)} maxLength={30} placeholder="+7 …"/></label>
    <label>WhatsApp<input type="tel" value={data.whatsapp} onChange={e=>update('whatsapp',e.target.value)} maxLength={30} placeholder={translate("Номер с кодом страны")}/></label>
    <label>{translate("Сайт")}<input type="url" value={data.website} onChange={e=>update('website',e.target.value)} placeholder="https://…"/></label>
    <label>{translate("Социальная сеть")}<input type="url" value={data.social} onChange={e=>update('social',e.target.value)} placeholder="https://…"/></label>
   </div></section>
   <section className="form-section form-map"><h2>{translate("Точка на карте")}</h2><p>{translate("Нажмите на карту или введите координаты вручную. Без координат объект будет доступен только в каталоге.")}</p>
    <div className="form-grid" style={{marginBottom:18}}><label>{translate("Широта")}<input type="number" min="-90" max="90" step="any" value={data.lat??''} onChange={e=>update('lat',e.target.value===''?null:Number(e.target.value))}/></label><label>{translate("Долгота")}<input type="number" min="-180" max="180" step="any" value={data.lng??''} onChange={e=>update('lng',e.target.value===''?null:Number(e.target.value))}/></label></div>
    <MapView point={point} onPick={(lat,lng)=>setData(old=>({...old,lat,lng}))}/>
   </section>
  </>)}
  {translate(step==='pay'&&<section className="form-section">
   <h2>{translate("Оплата размещения")}</h2>
   <Payment config={payment} listingId={id==='new'?undefined:id}/>
   <div className="form-grid" style={{marginTop:22}}>
    <label className="full-width">{translate("От кого поступит оплата *")}<input value={payer} onChange={e=>setPayer(e.target.value)} maxLength={120} placeholder={translate("Фамилия и имя плательщика")} disabled={Boolean(paidAt)}/><span className="form-help">{translate("Укажите так, как имя отображается в банке, — по нему мы найдём платёж в выписке.")}</span></label>
   </div>
   {translate(paidAt
    ?<div className="notice" role="status"><Check size={16}/>{translate(" Оплата отмечена: ")}{translate(payer)}{translate(". Отправьте заявку на проверку — мы сверим поступление и опубликуем объект.")}</div>
    :<p className="form-help">{translate("После оплаты нажмите «Я оплатил» — тогда откроется отправка на проверку. Мы проверим поступление вручную.")}</p>)}
  </section>)}
  {translate(error&&<div role="alert" className="error-message">{translate(error)}</div>)}
  {translate(message&&<div role="status" className="notice">{translate(message)}</div>)}
  <div className="form-actions">
   {translate(step==='info'
    ?<><button className="button secondary" disabled={busy||uploading} type="submit"><Save size={17}/>{translate(busy?'Сохраняем…':'Сохранить черновик')}</button>
      {translate(payable
       ?<button className="button" disabled={busy||uploading} type="button" onClick={e=>toPayment(e.currentTarget.form)}>{translate("Далее — оплата ")}<ArrowRight size={17}/></button>
       :<button className="button" disabled={busy||uploading||!verified} type="button" onClick={e=>{if(e.currentTarget.form?.reportValidity())void submit();}}><Send size={17}/>{translate("Отправить на проверку")}</button>)}</>
    :<><button className="button secondary" disabled={busy} type="button" onClick={()=>setStep('info')}><ArrowLeft size={17}/>{translate("Назад к информации")}</button>
      {translate(!paidAt&&<button className="button" disabled={busy||payer.trim().length<3} type="button" onClick={markPaid}><Check size={17}/>{translate(busy?'Сохраняем…':'Я оплатил')}</button>)}
      <button className="button" disabled={busy||!paidAt||!verified} type="button" onClick={submit}><Send size={17}/>{translate("Отправить на проверку")}</button></>)}
  </div>
 </form>;
}
