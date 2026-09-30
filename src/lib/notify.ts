// Уведомления администратору в Telegram. Оба ключа необязательны: не заданы — молча пропускаем.
// Сбой отправки никогда не ломает действие пользователя, поэтому ошибки только логируются.
export async function notifyTelegram(text:string):Promise<boolean> {
 const token=process.env.TELEGRAM_BOT_TOKEN,chat=process.env.TELEGRAM_CHAT_ID;
 if(!token||!chat){console.log('Telegram не настроен, уведомление пропущено');return false;}
 try {
  const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text,disable_web_page_preview:true}),signal:AbortSignal.timeout(5000)});
  const result=await response.json().catch(()=>null) as {ok?:boolean;description?:string}|null;
  if(!response.ok||result?.ok!==true){console.error('Telegram отклонил уведомление',response.status,result?.description||'');return false;}
  return true;
 } catch(error) {console.error('Telegram недоступен',error instanceof Error?error.message:'');return false;}
}
