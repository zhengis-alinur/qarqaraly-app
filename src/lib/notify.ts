// Уведомления администратору в Telegram. Ключи необязательны: не заданы — молча пропускаем.
// Сбой отправки никогда не ломает действие пользователя, поэтому ошибки только логируются.
export type Button = {text:string; callback_data?:string; url?:string};
const api=async(method:string,payload:Record<string,unknown>)=>{
 const token=process.env.TELEGRAM_BOT_TOKEN;
 if(!token)return null;
 try {
  const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});
  const result=await response.json().catch(()=>null) as {ok?:boolean;description?:string;result?:unknown}|null;
  if(!response.ok||result?.ok!==true){console.error(`Telegram отклонил ${method}`,response.status,result?.description||'');return null;}
  return result.result??null;
 } catch(error){console.error(`Telegram недоступен (${method})`,error instanceof Error?error.message:'');return null;}
};
export async function notifyTelegram(text:string,buttons:Button[][]=[]):Promise<boolean> {
 const chat=process.env.TELEGRAM_CHAT_ID;
 if(!process.env.TELEGRAM_BOT_TOKEN||!chat){console.log('Telegram не настроен, уведомление пропущено');return false;}
 const send=(keyboard:Button[][])=>api('sendMessage',{chat_id:chat,text,disable_web_page_preview:true,...(keyboard.length?{reply_markup:{inline_keyboard:keyboard}}:{})});
 if(await send(buttons))return true;
 // Потерять извещение о заявке хуже, чем потерять кнопки: если клавиатуру не приняли, шлём текстом.
 return Boolean(buttons.length&&await send([]));
}
/** Всплывающий ответ на нажатие кнопки — Telegram ждёт его, иначе кнопка «залипает». */
export const answerCallback=(id:string,text:string)=>api('answerCallbackQuery',{callback_query_id:id,text,show_alert:false});
/** Переписываем исходное сообщение итогом и убираем кнопки, чтобы их не нажали второй раз. */
export const editMessage=(chat:number|string,messageId:number,text:string)=>api('editMessageText',{chat_id:chat,message_id:messageId,text,disable_web_page_preview:true,reply_markup:{inline_keyboard:[]}});
