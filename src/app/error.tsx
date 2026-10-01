'use client';
import { useTranslator } from '@/components/LocaleProvider';

export default function ErrorPage({reset}:{reset:()=>void}){const translate=useTranslator();return <div className="container page"><div className="empty"><h1>{translate("Не удалось загрузить страницу")}</h1><p>{translate("Проверьте подключение к сервису и попробуйте ещё раз.")}</p><button className="button" onClick={reset}>{translate("Попробовать снова")}</button></div></div>;}
