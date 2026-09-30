// Регистрация вебхука Telegram: node --env-file=.env --import tsx scripts/telegram-webhook.ts
// Снять регистрацию: тот же вызов с аргументом --delete.
// Вебхук нужен только для кнопок «Опубликовать»/«Отклонить» под уведомлением о заявке.
const token=process.env.TELEGRAM_BOT_TOKEN||'';
const secret=process.env.TELEGRAM_WEBHOOK_SECRET||'';
const site=(process.env.APP_URL||'').replace(/\/+$/,'');
async function call(method:string,payload:Record<string,unknown>={}) {
 const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const result=await response.json() as {ok:boolean;description?:string;result?:unknown};
 if(!result.ok) throw new Error(`${method}: ${result.description||response.status}`);
 return result.result;
}
async function main() {
 if(!token) throw new Error('Задайте TELEGRAM_BOT_TOKEN');
 if(process.argv.includes('--delete')) {await call('deleteWebhook',{drop_pending_updates:true});console.log('Вебхук снят.');return;}
 if(!secret||secret.length<16) throw new Error('Задайте TELEGRAM_WEBHOOK_SECRET минимум из 16 символов (openssl rand -hex 32)');
 if(!/^https:\/\//.test(site)) throw new Error('APP_URL должен быть публичным https-адресом сайта');
 await call('setWebhook',{url:`${site}/api/telegram`,secret_token:secret,allowed_updates:['callback_query'],drop_pending_updates:true});
 const info=await call('getWebhookInfo') as {url?:string;pending_update_count?:number;last_error_message?:string};
 console.log(`Вебхук установлен: ${info.url}`);
 if(info.last_error_message) console.log(`Последняя ошибка доставки: ${info.last_error_message}`);
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});
