import { existsSync } from 'node:fs';
import path from 'node:path';
// Статический QR Halyk: сумму плательщик вводит сам, подтверждение оплаты на сайт не приходит.
// Поэтому блок оплаты — это инструкция, а не платёжный шлюз: публикацию всё равно открывает модератор.
export type Payment = {qr:string|null; link:string; amount:number|null; note:string};
export function payment():Payment {
 const qr=process.env.PAYMENT_QR||'/pay/halyk-qr.png';
 const amount=Number(process.env.PAYMENT_AMOUNT);
 return {
  qr:existsSync(path.join(process.cwd(),'public',qr.replace(/^\//,'')))?qr:null,
  link:process.env.PAYMENT_LINK||'',
  amount:Number.isFinite(amount)&&amount>0?amount:null,
  note:process.env.PAYMENT_NOTE||'',
 };
}
export const amountLabel=(amount:number)=>`${amount.toLocaleString('ru-RU')} ₸`;
