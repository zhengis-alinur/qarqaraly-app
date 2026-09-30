'use client';
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
export default function ListingForm({listing,tax,verified,payment,claim}:{listing?:Listing;tax:Taxonomy[];verified:boolean;payment:PaymentConfig;claim?:PaymentClaim}) {
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
   <span className="eyebrow">{listing?statusLabels[listing.status]:'НОВОЕ МЕСТО'}</span>
   <h1 style={{fontSize:32,margin:'12px 0'}}>Расскажите о вашем объекте</h1>
   <p className="form-help">Первая фотография станет обложкой. Изменения опубликованной карточки появятся после модерации.</p>
  </div>
  {payable&&<ol className="form-steps"><li className={step==='info'?'active':''}>1. Информация</li><li className={step==='pay'?'active':''}>2. Оплата</li></ol>}
  {listing?.feedback&&<div className="notice warning">Комментарий модератора: {listing.feedback}</div>}
  {!verified&&<div className="notice warning">Черновик можно сохранить сейчас. Для отправки на проверку подтвердите номер телефона.</div>}
  {step==='info'&&<>
   <section className="form-section"><h2>Основная информация</h2><div className="form-grid">
    <label>Название *<input value={data.title} onChange={e=>update('title',e.target.value)} required minLength={3} maxLength={120} placeholder="Название вашего места"/></label>
    <label>Категория *<select value={data.category} onChange={e=>changeCategory(e.target.value)}>{tax.filter(t=>t.kind==='category').map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
    <label className="full-width">Описание *<textarea value={data.description} onChange={e=>update('description',e.target.value)} required minLength={30} maxLength={10000} rows={6} placeholder="Чем интересно ваше место и что ждёт гостей? Минимум 30 символов."/></label>
    <label className="full-width">Адрес *<input value={data.address} onChange={e=>update('address',e.target.value)} required minLength={3} maxLength={300}/></label>
    {fields.price&&<><label>Стоимость, ₸<input type="number" min="0" max="100000000" value={data.price??''} onChange={e=>update('price',e.target.value===''?null:Number(e.target.value))} placeholder="Не указана"/><span className="form-help">Оставьте пустым, если цену нужно уточнять.</span></label>
    <label>Единица стоимости<select value={data.priceUnit} onChange={e=>update('priceUnit',e.target.value)}>{['за ночь','за человека','за час','за услугу'].map(u=><option key={u}>{u}</option>)}</select></label></>}
   </div></section>
   <section className="form-section"><h2>Фотографии</h2><p>До 10 фотографий, JPG / PNG / WebP, до 10 МБ каждая.</p>
    <label className="file-input"><span><Upload size={16}/> {uploading?'Загружаем фотографии…':'Выбрать фотографии'}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading||data.photos.length>=10} onChange={async e=>{const files=Array.from(e.target.files||[]);e.target.value='';if(data.photos.length+files.length>10){setError('Можно добавить не больше 10 фотографий');return;}setUploading(true);setError('');try{for(const file of files){if(file.size>10*1024*1024)throw new Error('Фотография превышает 10 МБ');const form=new FormData();form.set('file',file);const response=await fetch('/api/upload',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw new Error(result.error);setData(old=>({...old,photos:[...old.photos,{url:result.url,caption:''}]}));}}catch(problem){setError((problem as Error).message);}finally{setUploading(false);}}}/></label>
    <div className="photo-editor">{data.photos.map((p,i)=><div className="photo-edit" key={p.url}><img src={p.url} alt={p.caption||`Фото ${i+1}`}/><input aria-label={`Подпись к фото ${i+1}`} placeholder="Подпись к фотографии" value={p.caption} maxLength={200} onChange={e=>update('photos',data.photos.map((photo,j)=>j===i?{...photo,caption:e.target.value}:photo))}/><div className="photo-controls"><button className="button secondary" type="button" disabled={i===0} onClick={()=>update('photos',[p,...data.photos.filter((_,j)=>j!==i)])}><ArrowUp size={12}/>{i===0?'Обложка':'На обложку'}</button><button className="button secondary" type="button" aria-label={`Удалить фото ${i+1}`} onClick={()=>update('photos',data.photos.filter((_,j)=>j!==i))}><Trash2 size={13}/></button></div></div>)}</div>
   </section>
   {(fields.amenities||fields.conditions)&&<section className="form-section"><h2>Удобства и условия</h2><div className="form-grid">
    {fields.amenities&&<fieldset className="full-width"><legend>Что есть у вас?</legend><div className="amenity-tags">{tax.filter(t=>t.kind==='amenity').map(a=><label className="checkbox" key={a._id}><input type="checkbox" checked={data.amenities.includes(a.name)} onChange={e=>update('amenities',e.target.checked?[...data.amenities,a.name]:data.amenities.filter(x=>x!==a.name))}/>{a.name}</label>)}</div></fieldset>}
    {fields.conditions&&<label>Условия посещения / проживания<textarea value={data.conditions} onChange={e=>update('conditions',e.target.value)} maxLength={5000} placeholder="Время заезда, правила, ограничения"/></label>}
    <label>Время работы и сезонность<textarea value={data.hours} onChange={e=>update('hours',e.target.value)} maxLength={500} placeholder="Дни и часы работы"/></label>
   </div></section>}
   <section className="form-section"><h2>Контакты</h2><div className="form-grid">
    <label>Телефон<input type="tel" value={data.phone} onChange={e=>update('phone',e.target.value)} maxLength={30} placeholder="+7 …"/></label>
    <label>WhatsApp<input type="tel" value={data.whatsapp} onChange={e=>update('whatsapp',e.target.value)} maxLength={30} placeholder="Номер с кодом страны"/></label>
    <label>Сайт<input type="url" value={data.website} onChange={e=>update('website',e.target.value)} placeholder="https://…"/></label>
    <label>Социальная сеть<input type="url" value={data.social} onChange={e=>update('social',e.target.value)} placeholder="https://…"/></label>
   </div></section>
   <section className="form-section form-map"><h2>Точка на карте</h2><p>Нажмите на карту или введите координаты вручную. Без координат объект будет доступен только в каталоге.</p>
    <div className="form-grid" style={{marginBottom:18}}><label>Широта<input type="number" min="-90" max="90" step="any" value={data.lat??''} onChange={e=>update('lat',e.target.value===''?null:Number(e.target.value))}/></label><label>Долгота<input type="number" min="-180" max="180" step="any" value={data.lng??''} onChange={e=>update('lng',e.target.value===''?null:Number(e.target.value))}/></label></div>
    <MapView point={point} onPick={(lat,lng)=>setData(old=>({...old,lat,lng}))}/>
   </section>
  </>}
  {step==='pay'&&<section className="form-section">
   <h2>Оплата размещения</h2>
   <Payment config={payment} listingId={id==='new'?undefined:id}/>
   <div className="form-grid" style={{marginTop:22}}>
    <label className="full-width">От кого поступит оплата *<input value={payer} onChange={e=>setPayer(e.target.value)} maxLength={120} placeholder="Фамилия и имя плательщика" disabled={Boolean(paidAt)}/><span className="form-help">Укажите так, как имя отображается в банке, — по нему мы найдём платёж в выписке.</span></label>
   </div>
   {paidAt
    ?<div className="notice" role="status"><Check size={16}/> Оплата отмечена: {payer}. Отправьте заявку на проверку — мы сверим поступление и опубликуем объект.</div>
    :<p className="form-help">После оплаты нажмите «Я оплатил» — тогда откроется отправка на проверку. Мы проверим поступление вручную.</p>}
  </section>}
  {error&&<div role="alert" className="error-message">{error}</div>}
  {message&&<div role="status" className="notice">{message}</div>}
  <div className="form-actions">
   {step==='info'
    ?<><button className="button secondary" disabled={busy||uploading} type="submit"><Save size={17}/>{busy?'Сохраняем…':'Сохранить черновик'}</button>
      {payable
       ?<button className="button" disabled={busy||uploading} type="button" onClick={e=>toPayment(e.currentTarget.form)}>Далее — оплата <ArrowRight size={17}/></button>
       :<button className="button" disabled={busy||uploading||!verified} type="button" onClick={e=>{if(e.currentTarget.form?.reportValidity())void submit();}}><Send size={17}/>Отправить на проверку</button>}</>
    :<><button className="button secondary" disabled={busy} type="button" onClick={()=>setStep('info')}><ArrowLeft size={17}/>Назад к информации</button>
      {!paidAt&&<button className="button" disabled={busy||payer.trim().length<3} type="button" onClick={markPaid}><Check size={17}/>{busy?'Сохраняем…':'Я оплатил'}</button>}
      <button className="button" disabled={busy||!paidAt||!verified} type="button" onClick={submit}><Send size={17}/>Отправить на проверку</button></>}
  </div>
 </form>;
}
