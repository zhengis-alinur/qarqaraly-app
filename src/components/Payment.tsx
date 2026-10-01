'use client';
import { useTranslator } from '@/components/LocaleProvider';
import Link from 'next/link';
import type { PaymentConfig } from '@/lib/payment';
export const amountLabel=(amount:number)=>`${amount.toLocaleString('ru-RU')} ₸`;
// Блок оплаты по статическому QR. Ничего не отправляет и не проверяет: поступление администратор
// сверяет по выписке, а объект публикуется после модерации. Годится и на сервере, и внутри формы.
export default function Payment({config,listingId}:{config:PaymentConfig;listingId?:string}) {const translate=useTranslator();
 const {qr,link,amount,note}=config;
 if(!qr&&!link) return null;
 return <div className="pay-card">
  <div>
   <span className="eyebrow">{translate("ОПЛАТА РАЗМЕЩЕНИЯ")}</span>
   <h2>{translate(amount?`${translate("К оплате")} ${amountLabel(amount)}`:'Оплата по QR')}</h2>
   <p>{translate("Откройте приложение банка, отсканируйте код и ")}<strong>{translate("введите сумму вручную")}</strong>{translate(amount?<> — {translate(amountLabel(amount))}</>:null)}.{translate(listingId?<>{translate(" В комментарии к платежу укажите номер заявки ")}<strong>{translate(listingId.slice(0,8))}</strong>{translate(", чтобы мы быстрее её нашли.")}</>:null)}</p>
   <p>{translate("Оплата подтверждается вручную: мы сверяем поступление по выписке банка.")}</p>
   {translate(note&&<p>{translate(note)}</p>)}
   {translate(link&&<Link className="button secondary small" href={link} target="_blank" rel="noopener noreferrer">{translate("Открыть в приложении банка (с телефона)")}</Link>)}
  </div>
  {translate(qr&&<img className="pay-qr" src={qr} alt={translate("QR-код для оплаты")} width={260} height={260}/>)}
 </div>;
}
