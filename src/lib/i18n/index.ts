import kk from './kk.json';
export type Locale = 'ru' | 'kk';
export const localeCookie = 'qarqaraly-locale';
export const normalizeLocale = (value?: string): Locale => value === 'ru' ? 'ru' : 'kk';
const dictionary: Record<string, string> = kk;
/** Translate presentation strings only; unknown and user-authored content stays intact. */
export function translator(locale: Locale) {
  return function t<T>(value: T): T {
    if (locale !== 'kk' || typeof value !== 'string') return value;
    const key = value.replace(/\s+/g, ' ').trim();
    const translated = dictionary[key];
    return (translated === undefined ? value : value.replace(/\S[\s\S]*\S|\S/, translated)) as T;
  };
}
export const intlLocale = (locale: Locale) => locale === 'kk' ? 'kk-KZ' : 'ru-RU';
