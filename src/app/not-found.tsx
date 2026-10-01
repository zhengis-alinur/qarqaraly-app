import { getTranslator } from '@/lib/i18n/server';
import Link from 'next/link';
export default async function NotFound(){const translate=await getTranslator();return <div className="container page"><div className="empty"><span className="eyebrow">{translate("404 · СБИЛИСЬ С ТРОПЫ")}</span><h1>{translate("Здесь пока нет страницы")}</h1><p>{translate("Возможно, объект снят с публикации или ссылка изменилась.")}</p><Link className="button" href="/catalog">{translate("Вернуться в каталог")}</Link></div></div>;}
