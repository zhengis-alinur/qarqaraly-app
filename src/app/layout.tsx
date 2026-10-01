import { getLocale } from '@/lib/i18n/server';
import { LocaleProvider } from '@/components/LocaleProvider';
import { getTranslator } from '@/lib/i18n/server';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Header from '@/components/Header';
import { currentUser } from '@/lib/auth';
import { siteUrl } from '@/lib/data';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL(siteUrl()),title:{default:'Qarqaraly — откройте Каркаралинск',template:'%s · Qarqaraly'},description:'Места для отдыха, проживание, экскурсии и полезная информация для поездки в Каркаралинск.'};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#234c3c'};
export default async function RootLayout({children}:{children:React.ReactNode}) {const translate=await getTranslator();const user=await currentUser();const locale=await getLocale();return <html lang={locale}><body><LocaleProvider locale={locale}><a className="skip-link" href="#main">{translate("Перейти к содержимому")}</a><Header signedIn={!!user} admin={user?.role==='admin'}/><main id="main">{translate(children)}</main><footer className="site-footer"><div className="container footer-top"><div><Link className="brand" href="/"><img className="brand-image" src="/brand/qarqaraly-logo.webp" alt={translate("Қарқаралы — главная")} width={2172} height={724}/></Link><p>{translate("Маленькое путешествие.")}<br/>{translate("Большое вдохновение.")}</p></div><div className="footer-links"><Link href="/catalog">{translate("Места и услуги")}</Link><Link href="/map">{translate("Карта Каркаралинска")}</Link><Link href="/sights">{translate("Достопримечательности")}</Link><Link href="/guide">{translate("Путеводитель")}</Link><Link href="/news">{translate("Новости")}</Link></div><div><span className="eyebrow">{translate("ДЛЯ МЕСТНОГО БИЗНЕСА")}</span><p>{translate("Помогите гостям найти вас.")}</p><Link className="text-link" href="/dashboard/new">{translate("Разместить свой объект ")}<ArrowUpRight size={18}/></Link></div></div><div className="container footer-bottom"><span>© {translate(new Date().getFullYear())} Qarqaraly</span><span>{translate("С любовью к месту, где мы живём")}</span><Link href="/privacy">{translate("Конфиденциальность")}</Link></div></footer></LocaleProvider></body></html>;}
