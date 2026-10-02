'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslator } from './LocaleProvider';

export default function DraftRecovery({ userId }: { userId: string }) {
  const router = useRouter();
  const t = useTranslator();
  const [drafts, setDrafts] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    const prefix = `qarqaraly:draft:${userId}:`;
    const marker = `qarqaraly:draft-updated:${userId}`;
    const load = () => {
      try {
        const pending: typeof drafts = [];
        for (let index = 0; index < localStorage.length; index++) {
          const key = localStorage.key(index);
          if (!key?.startsWith(prefix)) continue;
          const id = key.slice(prefix.length);
          if (id !== 'new' && !/^[a-f0-9-]{36}$/.test(id)) continue;
          const stored = JSON.parse(localStorage.getItem(key) || 'null');
          if (stored?.data && typeof stored.data.title === 'string') pending.push({ id, title: stored.data.title });
        }
        setDrafts(pending);
      } catch { /* Server drafts remain available when local storage is disabled. */ }
    };
    const saved = () => {
      load();
      try { sessionStorage.removeItem(marker); } catch { /* Optional cache hint. */ }
      router.refresh();
    };
    window.addEventListener('qarqaraly:draft-saved', saved);
    window.addEventListener('storage', load);
    load();
    try { if (sessionStorage.getItem(marker)) saved(); } catch { /* Optional cache hint. */ }
    return () => {
      window.removeEventListener('qarqaraly:draft-saved', saved);
      window.removeEventListener('storage', load);
    };
  }, [userId, router]);
  if (!drafts.length) return null;
  return <aside className="notice" aria-label={t('Незавершённый ввод')}>
    <p>{t('На этом устройстве есть ввод, который ещё не сохранён в аккаунт.')}</p>
    {drafts.map(draft => <p key={draft.id}><Link className="text-link" href={`/dashboard/${draft.id}`}>
      {t('Продолжить заполнение')}: {draft.title.trim() || t('Черновик без названия')}
    </Link></p>)}
  </aside>;
}
