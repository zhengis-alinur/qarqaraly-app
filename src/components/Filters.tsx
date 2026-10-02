'use client';
import { useTranslator } from '@/components/LocaleProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition, type FormEvent } from 'react';
import { SlidersHorizontal, Search } from 'lucide-react';
import MobileSheet from './MobileSheet';
import type { Taxonomy } from '@/lib/types';

export default function Filters({tax,params,action='/catalog'}:{tax:Taxonomy[];params:Record<string,string|undefined>;action?:string}) {
 const translate=useTranslator();
 const [open,setOpen]=useState(false);
 const [pending,startTransition]=useTransition();
 const router=useRouter();
 const sheetId=useId();
 const activeCount=['q','category','min','max','amenities'].filter(key=>!!params[key]).length + (params.sort && params.sort !== 'updated' ? 1 : 0);
 function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form=event.currentTarget;
  const query=new URLSearchParams();
  new FormData(form).forEach((value,key)=>{if(typeof value==='string' && value.trim())query.set(key,value.trim());});
  const amenities=Array.from(form.querySelectorAll<HTMLInputElement>('input[data-amenity]:checked')).map(input=>input.value);
  if(amenities.length)query.set('amenities',amenities.join(','));else query.delete('amenities');
  startTransition(()=>router.push(`${action}?${query}`,{scroll:false}));
  setOpen(false);
 }
 const fields=()=><form action={action} className="filters" aria-busy={pending} onSubmit={submit}><div className="filter-title"><SlidersHorizontal size={18}/><h2>{translate("Найти своё место")}</h2></div><label>{translate("Поиск")}<div className="input-icon"><Search size={17}/><input name="q" defaultValue={params.q} placeholder={translate("Название места")} maxLength={100}/></div></label><label>{translate("Категория")}<select name="category" defaultValue={params.category||''}><option value="">{translate("Все категории")}</option>{translate(tax.filter(t=>t.kind==='category').map(c=><option key={c._id} value={c._id}>{translate(c.name)}</option>))}</select></label><fieldset><legend>{translate("Стоимость, ₸")}</legend><div className="price-inputs"><input name="min" type="number" min="0" aria-label={translate("Минимальная цена")} placeholder={translate("От")} defaultValue={params.min}/><input name="max" type="number" min="0" aria-label={translate("Максимальная цена")} placeholder={translate("До")} defaultValue={params.max}/></div></fieldset><fieldset><legend>{translate("Удобства")}</legend>{translate(tax.filter(t=>t.kind==='amenity').map(a=><label className="checkbox" key={a._id}><input type="checkbox" data-amenity value={a.name} defaultChecked={params.amenities?.split(',').includes(a.name)}/>{translate(a.name)}</label>))}</fieldset><input type="hidden" name="amenities" defaultValue={params.amenities||''}/><label>{translate("Сортировка")}<select name="sort" defaultValue={params.sort||'updated'}><option value="updated">{translate("Недавно обновлённые")}</option><option value="price-asc">{translate("Сначала дешевле")}</option><option value="price-desc">{translate("Сначала дороже")}</option></select></label><button className="button" type="submit" disabled={pending}>{translate(pending?"Применяем…":"Показать места ")}<Search size={17}/></button><Link href={action} className="filter-reset" onClick={()=>setOpen(false)}>{translate("Сбросить фильтры")}</Link></form>;
 return <>
  <button type="button" className="button secondary filter-toggle" aria-expanded={open} aria-controls={sheetId} aria-haspopup="dialog" disabled={pending} onClick={()=>setOpen(true)}>
   <SlidersHorizontal size={18}/>{translate(pending?'Применяем…':'Фильтры')}{activeCount>0&&<span className="filter-count">{activeCount}</span>}
  </button>
  <div className="desktop-filters">{fields()}</div>
  <MobileSheet open={open} onClose={()=>setOpen(false)} title={translate('Фильтры')} id={sheetId}>{fields()}</MobileSheet>
 </>;
}
