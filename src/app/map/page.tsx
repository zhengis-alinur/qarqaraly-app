import { getTranslator } from '@/lib/i18n/server';
import Link from 'next/link';
import { List } from 'lucide-react';
import { catalog, taxonomy } from '@/lib/data';
import Filters from '@/components/Filters';
import MapView from '@/components/MapView';
import { PageTitle } from '@/components/UI';
export const metadata={title:'Карта Каркаралинска',alternates:{canonical:'/map'}};
export default async function MapPage({searchParams}:{searchParams:Promise<Record<string,string>>}) {const translate=await getTranslator();const params=await searchParams;const [{items},tax]=await Promise.all([catalog(params,true),taxonomy()]);const mapped=items.filter(i=>i.lat!==null&&i.lng!==null);return <div className="container page"><PageTitle eyebrow={translate("ПУСТЬ ПУТЬ ВДОХНОВЛЯЕТ")} title={translate("Каркаралинск на карте")} text={translate("Выберите маркер, чтобы узнать больше о месте.")}/><div className="catalog-layout"><aside><Filters tax={tax} params={params} action="/map"/></aside><div className="catalog-results"><div className="results-toolbar"><span>{translate("На карте: ")}<strong>{translate(mapped.length)}</strong></span><Link className="button secondary small" href={`/catalog?${new URLSearchParams(params)}`}><List size={17}/>{translate("Списком")}</Link></div><MapView items={mapped}/>{translate(mapped.some(i=>i.demo)&&<p className="notice warning">{translate("Маркеры «ДЕМО» обозначают вымышленные объекты. Их координаты условные и не предназначены для навигации.")}</p>)}{translate(!mapped.length&&<p className="notice">{translate("Нет объектов с координатами по выбранным фильтрам.")}</p>)}<div className="map-accessible-list">{translate(mapped.map(i=><Link key={i.id} href={`/places/${i.slug}`}>{translate(i.title)}</Link>))}</div></div></div></div>;}
