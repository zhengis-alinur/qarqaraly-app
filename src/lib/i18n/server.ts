import { cookies } from 'next/headers';
import { localeCookie, normalizeLocale, translator } from './index';
export async function getLocale() {
  return normalizeLocale((await cookies()).get(localeCookie)?.value);
}
export async function getTranslator() { return translator(await getLocale()); }
