'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { House, Map, Compass, BookOpen, Ellipsis, Mountain, Newspaper, UserRound, Plus, ShieldCheck, ChevronRight } from 'lucide-react';
import { useTranslator } from './LocaleProvider';
import MobileSheet from './MobileSheet';

const tabs = [
  { href: '/', label: 'Главная', icon: House, matches: (path: string) => path === '/' },
  { href: '/catalog', label: 'Места', icon: Compass, matches: (path: string) => path === '/catalog' || path.startsWith('/places/') },
  { href: '/map', label: 'Карта', icon: Map, matches: (path: string) => path === '/map' },
  { href: '/guide', label: 'Гид', icon: BookOpen, matches: (path: string) => path.startsWith('/guide') || path === '/sights' },
];

export default function MobileNavigation({ signedIn, admin }: { signedIn: boolean; admin: boolean }) {
  const t = useTranslator();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);

  // Keep navigation out of the way while the on-screen keyboard is open.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const editing = document.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
      document.documentElement.classList.toggle('mobile-keyboard-open', !!editing && window.innerHeight - viewport.height > 150);
    };
    viewport.addEventListener('resize', update);
    document.addEventListener('focusout', update);
    return () => {
      viewport.removeEventListener('resize', update);
      document.removeEventListener('focusout', update);
      document.documentElement.classList.remove('mobile-keyboard-open');
    };
  }, []);

  const links = [
    { href: '/sights', label: 'Что посмотреть', icon: Mountain },
    { href: '/news', label: 'Новости', icon: Newspaper },
    { href: signedIn ? (admin ? '/admin' : '/dashboard') : '/auth/login', label: signedIn ? (admin ? 'Администрирование' : 'Мой кабинет') : 'Войти', icon: UserRound },
    { href: '/dashboard/new', label: 'Разместить бизнес', icon: Plus },
    { href: '/privacy', label: 'Конфиденциальность', icon: ShieldCheck },
  ];

  return <>
    <nav className="mobile-tabbar" aria-label={t('Мобильная навигация')}>
      {tabs.map(({ href, label, icon: Icon, matches }) => <Link key={href} href={href}
        aria-current={!open && matches(pathname) ? 'page' : undefined}>
        <span className="mobile-tab-icon"><Icon size={22} aria-hidden /></span><span>{t(label)}</span>
      </Link>)}
      <button type="button" className={open || !tabs.some(tab => tab.matches(pathname)) ? 'is-active' : ''}
        aria-expanded={open} aria-controls="mobile-more" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="mobile-tab-icon"><Ellipsis size={22} aria-hidden /></span><span>{t('Ещё')}</span>
      </button>
    </nav>
    <MobileSheet open={open} onClose={() => setOpen(false)} title={t('Ваше путешествие')} id="mobile-more">
      <nav className="mobile-more-links" aria-label={t('Другие разделы')}>
        {links.map(({ href, label, icon: Icon }) => <Link href={href} key={href} onClick={() => setOpen(false)}
          aria-current={pathname === href ? 'page' : undefined}>
          <span className="mobile-more-icon"><Icon size={21} aria-hidden /></span>
          <span>{t(label)}</span><ChevronRight size={18} aria-hidden />
        </Link>)}
      </nav>
      <p className="mobile-more-note">Qarqaraly · {t('Маленькое путешествие. Большое вдохновение.')}</p>
    </MobileSheet>
  </>;
}
