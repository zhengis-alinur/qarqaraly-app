import { getTranslator } from '@/lib/i18n/server';
export default async function Loading(){const translate=await getTranslator();return <div className="loading" role="status"><span/>{translate("Собираем места для вашего путешествия…")}</div>;}
