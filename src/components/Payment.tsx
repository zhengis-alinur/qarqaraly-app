import Link from 'next/link';
import { payment, amountLabel } from '@/lib/payment';
// Блок оплаты по статическому QR. Ничего не отправляет и не проверяет: оплату администратор сверяет
// вручную по выписке, а объект публикуется после модерации.
export default function Payment({listingId}:{listingId?:string}) {
 const {qr,link,amount,note}=payment();
 if(!qr&&!link) return null;
 return <div className="pay-card">
  <div>
   <span className="eyebrow">ОПЛАТА РАЗМЕЩЕНИЯ</span>
   <h2>{amount?`К оплате ${amountLabel(amount)}`:'Оплата по QR'}</h2>
   <p>Откройте приложение банка, отсканируйте код и <strong>введите сумму вручную</strong>{amount?<> — {amountLabel(amount)}</>:null}.{listingId?<> В комментарии к платежу укажите номер заявки <strong>{listingId.slice(0,8)}</strong>, чтобы мы быстрее её нашли.</>:null}</p>
   <p>Оплата подтверждается вручную: мы сверяем поступление по выписке. Заявка уже отправлена на проверку — ждать оплату она не будет, но публикуем объект после проверки сведений и поступления оплаты.</p>
   {note&&<p>{note}</p>}
   {link&&<Link className="button secondary small" href={link} target="_blank" rel="noopener noreferrer">Открыть в приложении банка</Link>}
  </div>
  {qr&&<img className="pay-qr" src={qr} alt="QR-код для оплаты" width={260} height={260}/>}
 </div>;
}
