'use client';
import { useTranslator } from '@/components/LocaleProvider';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Send, Upload, Trash2, ArrowUp, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { api } from '@/lib/client';
import { isApproved } from '@/lib/listing-payment';
import { categoryFields } from '@/lib/categories';
import { emptyListing, statusLabels, type Listing, type ListingData, type PaymentClaim, type Taxonomy } from '@/lib/types';
import type { PaymentConfig } from '@/lib/payment';
import Payment, { amountLabel } from './Payment';
import MapView from './MapView';
/**
 * Заявка проходит три этапа: сведения, оплата и проверка перед отправкой. Отправить на проверку можно
 * только после того, как владелец подтвердил оплату кнопкой «Я оплатил» — это заявление с его слов,
 * подтверждения от банка сайт не получает. Состав полей первого шага зависит от категории.
 */
export default function ListingForm({listing,tax,verified,payment,claim}:{listing?:Listing;tax:Taxonomy[];verified:boolean;payment:PaymentConfig;claim?:PaymentClaim}) {const translate=useTranslator();
 const router=useRouter();
 const [data,setData]=useState<ListingData>(listing?.draft||emptyListing);
 const [id,setId]=useState(listing?._id||'new');
 const [revision,setRevision]=useState(listing?.revision||0);
 const [step,setStep]=useState<'info'|'pay'|'review'>('info');
 const stepHeading=useRef<HTMLHeadingElement>(null);
 const previousStep=useRef(step);
 const [payer,setPayer]=useState(claim?.payerName||'');
 const [paidAt,setPaidAt]=useState(claim?.claimedAt||'');
 const [busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const point=useMemo<[number,number]|undefined>(()=>data.lat!==null&&data.lng!==null?[data.lat,data.lng]:undefined,[data.lat,data.lng]);
 const update=<K extends keyof ListingData>(key:K,value:ListingData[K])=>setData(old=>({...old,[key]:value}));
 const fields=categoryFields(data.category);
 const approved=isApproved(listing);
 const paymentConfigured=Boolean(payment.qr||payment.link);
 const payable=!approved&&!paidAt;
 const steps=approved
  ?[{id:'info',title:'Об объекте',hint:'Описание, фото и контакты'},{id:'review',title:'Проверка и отправка',hint:'Сверьте данные перед отправкой'}] as const
  :[{id:'info',title:'Об объекте',hint:'Описание, фото и контакты'},{id:'pay',title:'Оплата',hint:paidAt?'Оплата отмечена':'Оплата размещения'},{id:'review',title:'Проверка и отправка',hint:'Сверьте данные перед отправкой'}] as const;
 const stepIndex=steps.findIndex(item=>item.id===step);
 useEffect(()=>{if(previousStep.current!==step){previousStep.current=step;stepHeading.current?.focus();stepHeading.current?.scrollIntoView({block:'start',behavior:'instant'});}},[step]);
 function goToStep(next:typeof step){setError('');setMessage('');setStep(next);}
 // Смена категории подтягивает единицу стоимости и очищает поля, которых у этой категории нет.
 function changeCategory(category:string) {
  const next=categoryFields(category);
  setData(old=>({...old,category,priceUnit:next.priceUnit,price:next.price?old.price:null,amenities:next.amenities?old.amenities:[],conditions:next.conditions?old.conditions:''}));
 }
 async function persist() {const result=await api(`listings/${id}/save`,{data,revision});setId(result.id);setRevision(result.revision);if(id==='new')window.history.replaceState(null,'',`/dashboard/${result.id}`);return result as {id:string;revision:number};}
 async function run(action:()=>Promise<void>) {setBusy(true);setError('');setMessage('');try{await action();}catch(problem){setError((problem as Error).message);}finally{setBusy(false);}}
 const saveDraft=()=>run(async()=>{await persist();setMessage(payable?'Черновик сохранён. Для публикации пройдите шаг оплаты и отправьте заявку на проверку.':'Изменения сохранены. Отправьте их на проверку, когда будете готовы.');});
 const continueFromInfo=(form:HTMLFormElement|null)=>{if(form&&!form.reportValidity())return;void run(async()=>{await persist();goToStep(payable?'pay':'review');});};
 const markPaid=()=>run(async()=>{
  if(payer.trim().length<3){setError('Укажите, от кого поступит оплата');return;}
  const result=await persist();
  const paid=await api(`listings/${result.id}/paid`,{revision:result.revision,payerName:payer});
  setRevision(paid.revision??result.revision+1);setPaidAt(new Date().toISOString());
  goToStep('review');
 });
 const submit=()=>run(async()=>{const result=await persist();await api(`listings/${result.id}/submit`,{revision:result.revision});router.push('/dashboard');router.refresh();});
 return <form onSubmit={e=>{e.preventDefault();if(!busy&&!uploading)void saveDraft();}} className="form-card listing-form">
  <div>
   <span className="eyebrow">{translate(listing?statusLabels[listing.status]:'НОВОЕ МЕСТО')}</span>
   <h1>{translate(listing?"Редактирование объекта":"Разместить объект")}</h1>
   <p className="form-help">{translate("Заполните карточку, затем отправьте её на проверку. Все этапы — ниже.")}</p>
  </div>
  {approved&&<div className="notice">{translate("Объект уже одобрен. Редактирование без повторной оплаты. Изменения появятся после проверки.")}</div>}
  {!approved&&<aside className="listing-price" aria-label={translate("Условия размещения")}>
   <div><span className="eyebrow">{translate("РАЗМЕЩЕНИЕ ПЛАТНОЕ")}</span><strong>{payment.amount?amountLabel(payment.amount):translate("Стоимость уточняется")}</strong><span>{translate("за размещение одного объекта")}</span></div>
   <div><p>{translate(paidAt?'Вы уже отметили оплату. Повторно платить не нужно — мы сверим поступление вручную.':'Оплата — после заполнения карточки. Сохранение черновика не требует оплаты.')}</p><p>{translate("Объект появится в каталоге после проверки оплаты и модерации.")}</p>{!payment.amount&&<p>{translate("Перед оплатой уточните стоимость у администрации.")}</p>}{payment.note&&<p>{translate(payment.note)}</p>}</div>
  </aside>}
  <nav aria-label={translate("Этапы размещения")}><ol className="listing-steps">{steps.map((item,index)=><li key={item.id} className={step===item.id?'active':index<stepIndex?'completed':''}><button type="button" aria-current={step===item.id?'step':undefined} disabled={busy||uploading||index>stepIndex} onClick={()=>goToStep(item.id)}><span className="listing-step-number" aria-hidden="true">{index<stepIndex?<Check size={16}/>:index+1}</span><span><strong>{translate(item.title)}</strong><small>{translate(item.hint)}</small></span></button></li>)}</ol></nav>
  <h2 ref={stepHeading} tabIndex={-1} className="listing-step-heading"><span>{translate("Шаг")} {stepIndex+1} {translate("из")} {steps.length}</span>{translate(steps[stepIndex].title)}</h2>
  {translate(listing?.feedback&&<div className="notice warning">{translate("Комментарий модератора: ")}{translate(listing.feedback)}</div>)}
  {translate(!verified&&<div className="notice warning">{translate("Черновик можно сохранить сейчас. Для отправки на проверку подтвердите номер телефона.")}</div>)}
  {translate(step==='info'&&<>
   <section className="form-section"><h2>{translate("Основная информация")}</h2><div className="form-grid">
    <label>{translate("Название *")}<input value={data.title} onChange={e=>update('title',e.target.value)} required minLength={3} maxLength={120} placeholder={translate("Название вашего места")}/></label>
    <label>{translate("Категория *")}<select value={data.category} onChange={e=>changeCategory(e.target.value)}>{translate(tax.filter(t=>t.kind==='category').map(c=><option key={c._id} value={c._id}>{translate(c.name)}</option>))}</select></label>
    <label className="full-width">{translate("Описание *")}<textarea value={data.description} onChange={e=>update('description',e.target.value)} required minLength={30} maxLength={10000} rows={6} placeholder={translate("Чем интересно ваше место и что ждёт гостей? Минимум 30 символов.")}/></label>
    <label className="full-width">{translate("Адрес *")}<input value={data.address} onChange={e=>update('address',e.target.value)} required minLength={3} maxLength={300}/></label>
    {translate(fields.price&&<><label>{translate("Стоимость, ₸")}<input type="number" min="0" max="100000000" value={data.price??''} onChange={e=>update('price',e.target.value===''?null:Number(e.target.value))} placeholder={translate("Не указана")}/><span className="form-help">{translate("Оставьте пустым, если цену нужно уточнять.")}</span></label>
    <label>{translate("Единица стоимости")}<select value={data.priceUnit} onChange={e=>update('priceUnit',e.target.value)}>{translate(['за ночь','за человека','за час','за услугу'].map(u=><option key={u} value={u}>{translate(u)}</option>))}</select></label></>)}
   </div></section>
   <section className="form-section"><h2>{translate("Фотографии")}</h2><p>{translate("До 10 фотографий, JPG / PNG / WebP, до 10 МБ каждая.")} {translate("Первая фотография станет обложкой.")}</p>
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
   {!paymentConfigured&&!paidAt&&<div className="notice warning" role="status">{translate("Черновик сохранён. Оплата пока не настроена — свяжитесь с администрацией для оплаты размещения.")}</div>}
   {!paidAt&&paymentConfigured&&<>
   <Payment config={payment} listingId={id==='new'?undefined:id}/>
   <div className="form-grid" style={{marginTop:22}}>
    <label className="full-width">{translate("От кого поступит оплата *")}<input value={payer} onChange={e=>setPayer(e.target.value)} maxLength={120} placeholder={translate("Фамилия и имя плательщика")} disabled={Boolean(paidAt)}/><span className="form-help">{translate("Укажите так, как имя отображается в банке, — по нему мы найдём платёж в выписке.")}</span></label>
   </div></>}
   {translate(paidAt
    ?<div className="notice" role="status"><Check size={16}/>{translate(" Оплата отмечена: ")}{translate(payer)}{translate(". Отправьте заявку на проверку — мы сверим поступление и опубликуем объект.")}</div>
    :paymentConfigured&&<p className="form-help">{translate("После перевода нажмите «Я оплатил» и проверьте карточку перед отправкой. Поступление денег мы сверим вручную.")}</p>)}
  </section>)}
  {step==='review'&&<section className="listing-review">
   <div className="listing-review-heading"><h3>{data.title}</h3><button type="button" className="text-link" disabled={busy} onClick={()=>goToStep('info')}>{translate("Изменить данные")}</button></div>
   {data.photos[0]&&<img className="listing-review-cover" src={data.photos[0].url} alt={data.photos[0].caption||data.title}/>}
   <dl><div><dt>{translate("Категория")}</dt><dd>{translate(tax.find(item=>item._id===data.category)?.name||data.category)}</dd></div><div><dt>{translate("Адрес")}</dt><dd>{data.address}</dd></div>{fields.price&&<div><dt>{translate("Стоимость, ₸")}</dt><dd>{data.price===null?translate("Не указана"):<>{amountLabel(data.price)} {translate(data.priceUnit)}</>}</dd></div>}<div><dt>{translate("Фотографии")}</dt><dd>{data.photos.length}</dd></div><div><dt>{translate("Телефон")}</dt><dd>{data.phone||'—'}</dd></div><div><dt>WhatsApp</dt><dd>{data.whatsapp||'—'}</dd></div><div><dt>{translate("Сайт")}</dt><dd>{data.website||'—'}</dd></div><div><dt>{translate("Социальная сеть")}</dt><dd>{data.social||'—'}</dd></div><div><dt>{translate("Точка на карте")}</dt><dd>{point?point.join(', '):translate("Не указана")}</dd></div></dl>
   <h3>{translate("Описание")}</h3><p className="listing-review-description">{data.description}</p>
   {fields.amenities&&data.amenities.length>0&&<><h3>{translate("Удобства и условия")}</h3><p>{data.amenities.map(value=>translate(value)).join(', ')}</p></>}
   {fields.conditions&&data.conditions&&<><h3>{translate("Условия посещения / проживания")}</h3><p className="listing-review-description">{data.conditions}</p></>}
   {data.hours&&<><h3>{translate("Время работы и сезонность")}</h3><p className="listing-review-description">{data.hours}</p></>}
   {!approved&&paidAt&&<div className="notice"><Check size={16}/> {translate("Оплата отмечена: ")}{payer}. {translate("Поступление денег проверит модератор.")}</div>}
   <p className="form-help">{translate("После отправки модератор проверит заявку. Статус и замечания появятся в разделе «Мои объекты».")}</p>
  </section>}
  {translate(error&&<div role="alert" className="error-message">{translate(error)}</div>)}
  {translate(message&&<div role="status" className="notice">{translate(message)}</div>)}
  <div className="form-actions">
   {translate(step==='info'
    ?<><button className="button secondary" disabled={busy||uploading} type="submit"><Save size={17}/>{translate(busy?'Сохраняем…':'Сохранить черновик')}</button>
      <button className="button" disabled={busy||uploading} type="button" onClick={e=>continueFromInfo(e.currentTarget.form)}>{translate(payable?'Далее — оплата':'Далее — проверка')}<ArrowRight size={17}/></button></>
    :<><button className="button secondary" disabled={busy} type="button" onClick={()=>goToStep(step==='review'&&!approved?'pay':'info')}><ArrowLeft size={17}/>{translate("Назад")}</button>
      {step==='pay'?(paidAt?<button className="button" disabled={busy} type="button" onClick={()=>goToStep('review')}>{translate("Далее — проверка")}<ArrowRight size={17}/></button>:<button className="button" disabled={busy||!paymentConfigured||payer.trim().length<3} type="button" onClick={markPaid}><Check size={17}/>{translate(busy?'Сохраняем…':'Я оплатил — проверить карточку')}</button>):<button className="button" disabled={busy||payable||!verified} type="button" onClick={submit}><Send size={17}/>{translate(busy?'Отправляем…':'Отправить на проверку')}</button>}</>)}
  </div>
 </form>;
}
