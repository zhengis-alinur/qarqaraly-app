import { redirect } from 'next/navigation';
import { needsPayment } from '@/lib/listing-payment';
import { getTranslator } from '@/lib/i18n/server';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { payment } from '@/lib/payment';
import Payment from '@/components/Payment';
import type { Listing } from '@/lib/types';
export const metadata={title:'Оплата размещения',robots:{index:false,follow:false}};
export default async function Pay() {const translate=await getTranslator();
 const user=await requireUser();
 const config=payment();const {qr,link}=config;
 // Берём последнюю заявку на проверке, чтобы подсказать её номер для комментария к платежу.
 const candidates=await (await db()).collection<Listing>('listings').find({ownerId:user._id,status:{$ne:'archived'}}).sort({updatedAt:-1}).toArray();
 const pending=candidates.find(needsPayment);
 if(!pending)redirect('/dashboard');
 return <div className="container page narrow">
  <Link href="/dashboard" className="text-link">{translate("← Мои объекты")}</Link>
  {translate(qr||link
   ?<><Payment config={config} listingId={pending?._id}/>{translate(pending&&<p className="form-help" style={{marginTop:16}}>{pending.draft.title}. <Link className="text-link" href={`/dashboard/${pending._id}`}>{translate("Продолжить заполнение")}</Link></p>)}</>
   :<div className="notice warning" role="status"><p>{translate("Оплата пока не настроена. Напишите нам, и мы подскажем, как оплатить размещение.")}</p></div>)}
 </div>;
}
