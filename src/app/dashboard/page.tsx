import { getTranslator } from '@/lib/i18n/server';
import Link from 'next/link';
import { Plus, ArrowUpRight, MapPin, Pencil, ImageIcon } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { statusLabels, type Listing } from '@/lib/types';
import { dateLabel } from '@/lib/data';
import { ListingAction } from '@/components/DashboardActions';
import { payment } from '@/lib/payment';
import { needsPayment } from '@/lib/listing-payment';
import { Empty } from '@/components/UI';
import DraftRecovery from '@/components/DraftRecovery';

export default async function Dashboard({searchParams}:{searchParams:Promise<{days?:string}>}) {
 const t=await getTranslator();
 const user=await requireUser();
 const requested=Number((await searchParams).days);
 const days=[7,30,90,365].includes(requested)?requested:30;
 const database=await db();
 const list=await database.collection<Listing>('listings').find({ownerId:user._id}).sort({updatedAt:-1}).toArray();
 const events=await database.collection('events').aggregate<{_id:{type:string;listingId:string};count:number}>([
  {$match:{listingId:{$in:list.map(l=>l._id)},createdAt:{$gte:new Date(Date.now()-days*86400000)}}},
  {$group:{_id:{type:'$type',listingId:'$listingId'},count:{$sum:1}}}
 ]).toArray();
 const count=(type:string,id?:string)=>events.filter(e=>e._id.type===type&&(!id||e._id.listingId===id)).reduce((sum,e)=>sum+e.count,0);
 const config=payment();
 const configured=Boolean(config.qr||config.link);
 const hints:Record<string,string>={draft:'Черновик виден только вам. Завершите заполнение и отправьте на проверку.',pending:'Заявка на проверке. Мы сообщим о результате.',published:'Объект опубликован и доступен посетителям.',changes:'Исправьте замечания модератора и отправьте объект повторно.',archived:'Объект скрыт из каталога. Вы можете отправить его на публикацию снова.'};
 return <div className="container page owner-dashboard">
  <div className="dashboard-heading"><div><span className="eyebrow">{t('КАБИНЕТ БИЗНЕСА')}</span><h1>{t('Мои объекты')}</h1><p>{t('Управляйте карточками и следите за интересом посетителей.')}</p></div><Link className="button" href="/dashboard/new"><Plus size={19}/>{t('Добавить объект')}</Link></div>
  <DraftRecovery userId={user._id}/>
  <section className="owner-list" aria-label={t('Мои объекты')}>
   {list.length?list.map(l=>{
    const reminder=Boolean(l.published&&(!l.confirmedAt||Date.now()-new Date(l.confirmedAt).getTime()>Number(process.env.CONFIRM_REMINDER_DAYS||30)*86400000));
    return <article className="owner-card" key={l._id}>
     <div className="owner-card-main">
      <Link className="owner-photo" href={`/dashboard/${l._id}`} aria-label={`${t('Редактировать')}: ${l.draft.title.trim()||t('Черновик без названия')}`}>{l.draft.photos[0]?<img src={l.draft.photos[0].url} alt=""/>:<ImageIcon size={30}/>}</Link>
      <div className="owner-card-info"><span className={`status ${l.status}`}>{t(l.published&&l.status==='draft'?'Есть неопубликованные изменения':statusLabels[l.status])}</span><h2><Link href={`/dashboard/${l._id}`}>{l.draft.title.trim()||t('Черновик без названия')}</Link></h2><p className="owner-address"><MapPin size={15}/>{l.draft.address.trim()||t('Адрес пока не указан')}</p><p>{t(l.published&&l.status!=='published'?'Посетители видят ранее опубликованную версию.':hints[l.status])}</p><span className="owner-updated">{t('Обновлено:')} {dateLabel(l.updatedAt)}</span></div>
     </div>
     {l.feedback&&<div className="notice warning"><strong>{t('Комментарий модератора:')}</strong> {l.feedback}</div>}
     {configured&&needsPayment(l)&&l.status!=='archived'&&<p className="owner-next-step">{t('Перед первой публикацией заполните карточку и оплатите размещение.')}</p>}
     {reminder&&<p className="notice warning">{t('Проверьте все сведения и подтвердите актуальность.')}</p>}
     <div className="owner-card-bottom"><div className="owner-metrics"><span>{t('Просмотры')}: <strong>{count('view',l._id)}</strong></span><span>{t('Контакты')}: <strong>{count('phone',l._id)+count('whatsapp',l._id)}</strong></span></div><div className="owner-actions">
      <Link className="button small" href={`/dashboard/${l._id}`}><Pencil size={15}/>{t(l.status==='draft'&&!l.published?'Продолжить заполнение':'Редактировать')}</Link>
      {l.published&&<><Link className="button secondary small" href={`/places/${l.slug}`}>{t('Открыть')}<ArrowUpRight size={15}/></Link><details className="owner-more"><summary>{t('Ещё')}</summary><div><ListingAction id={l._id} revision={l.revision} action="confirm" label="Подтвердить актуальность"/><ListingAction id={l._id} revision={l.revision} action="archive" label="Снять с публикации"/></div></details></>}
     </div></div>
    </article>;
   }):<Empty title={t('Здесь будет ваш первый объект')} text={t('Добавьте описание и фотографии — после проверки ваше место появится в каталоге.')}/>}
  </section>
  {list.length>0&&<section className="owner-analytics" aria-labelledby="analytics-title"><div className="owner-analytics-heading"><div><span className="eyebrow">{t('СТАТИСТИКА')}</span><h2 id="analytics-title">{t('Интерес к вашим местам')}</h2></div><nav className="owner-period" aria-label={t('Период')}>{[[7,'7 дней'],[30,'30 дней'],[90,'90 дней'],[365,'Год']].map(([value,label])=><Link key={value} href={`/dashboard?days=${value}`} scroll={false} aria-current={days===value?'page':undefined}>{t(label)}</Link>)}</nav></div><div className="stats-grid">{[['view','Просмотры'],['phone','Нажатия на телефон'],['whatsapp','Переходы в WhatsApp'],['route','Построение маршрута']].map(([key,title])=><div className="stat-card" key={key}><span>{t(title)}</span><strong>{count(key)}</strong></div>)}</div><p className="form-help">{t('Действия посетителей не означают бронирования или подтверждённых клиентов. Повторные действия одного браузера учитываются не чаще раза в час.')}</p></section>}
 </div>;
}
