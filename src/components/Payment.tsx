import Link from 'next/link';
import type { PaymentConfig } from '@/lib/payment';
export const amountLabel=(amount:number)=>`${amount.toLocaleString('ru-RU')} ₸`;
// Блок оплаты по статическому QR. Ничего не отправляет и не проверяет: поступление администратор
// сверяет по выписке, а объект публикуется после модерации. Годится и на сервере, и внутри формы.
export default function Payment({config,listingId}:{config:PaymentConfig;listingId?:string}) {
 const {qr,link,amount,note}=config;
 if(!qr&&!link) return null;
 return <div className="pay-card">
  <div>
   <span className="eyebrow">ОПЛАТА РАЗМЕЩЕНИЯ</span>
   <h2>{amount?`К оплате ${amountLabel(amount)}`:'Оплата по QR'}</h2>
   <p>Откройте приложение банка, отсканируйте код и <strong>введите сумму вручную</strong>{amount?<> — {amountLabel(amount)}</>:null}.{listingId?<> В комментарии к платежу укажите номер заявки <strong>{listingId.slice(0,8)}</strong>, чтобы мы быстрее её нашли.</>:null}</p>
   <p>Оплата подтверждается вручную: мы сверяем поступление по выписке банка.</p>
   {note&&<p>{note}</p>}
   {link&&<Link className="button secondary small" href={link} target="_blank" rel="noopener noreferrer">Открыть в приложении банка (с телефона)</Link>}
  </div>
  {qr&&<img className="pay-qr" src={qr} alt="QR-код для оплаты" width={260} height={260}/>}
 </div>;
}
