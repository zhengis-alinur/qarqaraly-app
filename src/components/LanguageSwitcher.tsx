'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { localeCookie, type Locale } from '@/lib/i18n';
import { useLocale } from './LocaleProvider';
export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function change(next: Locale) {
    if (next === locale) return;
    document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    startTransition(() => router.refresh());
  }
  return <div className="language-switcher" role="group" aria-label={locale === 'kk' ? 'Тілді таңдау' : 'Выбор языка'} aria-busy={pending}>
    {(['kk', 'ru'] as const).map(value => <button key={value} type="button" lang={value} aria-label={value === 'kk' ? 'Қазақша' : 'Русский'} aria-pressed={locale === value} disabled={pending} onClick={() => change(value)}>{value === 'kk' ? 'ҚАЗ' : 'РУС'}</button>)}
  </div>;
}
