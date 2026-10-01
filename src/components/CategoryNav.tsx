import { getTranslator } from '@/lib/i18n/server';
import Link from 'next/link';
import { BedDouble, Utensils, Compass, CarFront, Store, Tent, CupSoda, Landmark, Building2, MapPin, LayoutGrid, type LucideIcon } from 'lucide-react';
import type { Taxonomy } from '@/lib/types';

const icons: Record<string, LucideIcon> = {
  stay: BedDouble, food: Utensils, activities: Compass, transport: CarFront,
  shops: Store, recreation: Tent, kumys: CupSoda, sights: Landmark, city: Building2,
};

export default async function CategoryNav({ tax, params }: { tax: Taxonomy[]; params: Record<string, string> }) {const translate=await getTranslator();
  const categories = [{ _id: '', name: 'Все категории' }, ...tax.filter(item => item.kind === 'category')];
  return <nav className="catalog-categories" aria-label={translate("Категории мест и услуг")}>
    {translate(categories.map(category => {
      const query = new URLSearchParams(params);
      query.delete('page');
      if (category._id) query.set('category', category._id);
      else query.delete('category');
      const active = (params.category || '') === category._id;
      const Icon = category._id ? icons[category._id] || MapPin : LayoutGrid;
      return <Link key={category._id} href={`/catalog${query.size ? `?${query}` : ''}`} scroll={false}
        className={`catalog-category${active ? ' selected' : ''}`} aria-current={active ? 'page' : undefined}>
        <Icon size={18} aria-hidden="true" />{translate(category.name)}
      </Link>;
    }))}
  </nav>;
}
