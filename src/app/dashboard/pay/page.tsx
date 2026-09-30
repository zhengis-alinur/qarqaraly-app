import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { payment } from '@/lib/payment';
import Payment from '@/components/Payment';
import type { Listing } from '@/lib/types';
export const metadata={title:'Оплата размещения',robots:{index:false,follow:false}};
export default async function Pay() {
 const user=await requireUser();
 const config=payment();const {qr,link}=config;
 // Берём последнюю заявку на проверке, чтобы подсказать её номер для комментария к платежу.
 const pending=await (await db()).collection<Listing>('listings').find({ownerId:user._id,status:'pending'}).sort({updatedAt:-1}).limit(1).next();
 return <div className="container page narrow">
  <Link href="/dashboard" className="text-link">← Мои объекты</Link>
  {qr||link
   ?<><Payment config={config} listingId={pending?._id}/>{pending&&<p className="form-help" style={{marginTop:16}}>Заявка «{pending.draft.title}» на проверке. После поступления оплаты и проверки сведений мы опубликуем объект в каталоге.</p>}</>
   :<div className="notice warning" role="status"><p>Оплата пока не настроена. Напишите нам, и мы подскажем, как оплатить размещение.</p></div>}
 </div>;
}
