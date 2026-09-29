import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Header from '@/components/Header';
import { currentUser } from '@/lib/auth';
import { siteUrl } from '@/lib/data';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL(siteUrl()),title:{default:'Qarqaraly — откройте Каркаралинск',template:'%s · Qarqaraly'},description:'Места для отдыха, проживание, экскурсии и полезная информация для поездки в Каркаралинск.'};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#234c3c'};
export default async function RootLayout({children}:{children:React.ReactNode}) {const user=await currentUser();return <html lang="ru"><body><a className="skip-link" href="#main">Перейти к содержимому</a><Header signedIn={!!user} admin={user?.role==='admin'}/><main id="main">{children}</main><footer className="site-footer"><div className="container footer-top"><div><Link className="brand" href="/"><img className="brand-image" src="/brand/qarqaraly-logo.webp" alt="Қарқаралы — главная" width={2172} height={724}/></Link><p>Маленькое путешествие.<br/>Большое вдохновение.</p></div><div className="footer-links"><Link href="/catalog">Места и услуги</Link><Link href="/map">Карта Каркаралинска</Link><Link href="/sights">Достопримечательности</Link><Link href="/guide">Путеводитель</Link><Link href="/news">Новости</Link></div><div><span className="eyebrow">ДЛЯ МЕСТНОГО БИЗНЕСА</span><p>Помогите гостям найти вас.</p><Link className="text-link" href="/dashboard/new">Разместить свой объект <ArrowUpRight size={18}/></Link></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Qarqaraly</span><span>С любовью к месту, где мы живём</span><Link href="/privacy">Конфиденциальность</Link></div></footer></body></html>;}
