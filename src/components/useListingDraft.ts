'use client';

import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { listingDraftSchema } from '@/lib/validation';
import { emptyListing, type Listing, type ListingData } from '@/lib/types';

type Backup = { data: ListingData; base: string; draftId: string; revision: number; session: string };
type Saved = { id: string; revision: number };

export function useListingDraft(userId: string, listing: Listing | undefined, paused: boolean) {
  const [data, renderData] = useState<ListingData>(listing?.draft || emptyListing);
  const [id, renderId] = useState(listing?._id || 'new');
  const [status, setStatus] = useState('');
  const [recovery, setRecovery] = useState<ListingData | null>(null);
  const [ready, setReady] = useState(false);
  const state = useRef({
    data, id, revision: listing?.revision || 0, base: JSON.stringify(data),
    draftId: '', session: '', mounted: false, paused, conflict: false,
  });
  state.current.paused = paused;
  const inFlight = useRef<Promise<Saved> | null>(null);
  const key = (value: string) => `qarqaraly:draft:${userId}:${value}`;

  function backup() {
    const current = state.current;
    if (!current.draftId) current.draftId = crypto.randomUUID();
    if (!current.session) current.session = crypto.randomUUID();
    try {
      localStorage.setItem(key(current.id), JSON.stringify({
        data: current.data, base: current.base, draftId: current.draftId,
        revision: current.revision, session: current.session,
      } satisfies Backup));
      return true;
    } catch { return false; }
  }

  function removeOwnBackup(value: string) {
    try {
      const stored = JSON.parse(localStorage.getItem(key(value)) || 'null');
      if (stored?.session === state.current.session) localStorage.removeItem(key(value));
    } catch { /* Keep a backup we cannot safely identify. */ }
  }

  function setData(value: SetStateAction<ListingData>) {
    const current = state.current;
    current.data = typeof value === 'function' ? value(current.data) : value;
    renderData(current.data);
    // Synchronous backup: navigating away immediately after a keystroke is safe.
    const stored = backup();
    setStatus(stored ? 'Изменения сохранены на этом устройстве. Сохраняем в аккаунт…' : 'Есть несохранённые изменения. Сохраните черновик перед выходом.');
  }

  async function persist(): Promise<Saved> {
    if (inFlight.current) {
      await inFlight.current;
      return persist();
    }
    const current = state.current;
    if (current.conflict) throw new Error('Карточка уже изменена. Обновите страницу, чтобы восстановить свой ввод.');
    const snapshot = JSON.stringify(current.data);
    if (current.id !== 'new' && snapshot === current.base) return { id: current.id, revision: current.revision };
    const locallyStored = backup();
    const previousId = current.id;
    const revision = current.revision;
    if (current.mounted) setStatus('Сохраняем черновик…');
    const request = (async () => {
      const response = await fetch(`/api/listings/${previousId}/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ data: JSON.parse(snapshot), revision, draftId: current.draftId }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          current.conflict = true;
          // The first save may have succeeded even if its response was lost.
          // Recover against that same listing instead of repeatedly trying to create it.
          if (previousId === 'new' && result.id === current.draftId) {
            removeOwnBackup('new');
            current.id = result.id;
            backup();
            if (current.mounted) {
              renderId(result.id);
              if (window.location.pathname === '/dashboard/new') window.history.replaceState(null, '', `/dashboard/${result.id}`);
            }
          }
        }
        throw new Error(result.error || 'Не удалось сохранить черновик');
      }
      current.id = result.id;
      current.revision = result.revision;
      current.base = snapshot;
      // A response for older input must never remove newer input from this tab.
      const dirty = JSON.stringify(current.data) !== snapshot;
      removeOwnBackup(previousId);
      if (dirty) backup();
      // The dashboard may have rendered before the final save during navigation completed.
      try { sessionStorage.setItem(`qarqaraly:draft-updated:${userId}`, '1'); } catch { /* Optional cache hint. */ }
      window.dispatchEvent(new Event('qarqaraly:draft-saved'));
      if (current.mounted) {
        renderId(result.id);
        setStatus(dirty ? 'Изменения сохранены на этом устройстве. Сохраняем в аккаунт…' : 'Черновик сохранён автоматически');
        if (previousId === 'new' && window.location.pathname === '/dashboard/new') {
          window.history.replaceState(null, '', `/dashboard/${result.id}`);
        }
      }
      return result as Saved;
    })();
    inFlight.current = request;
    try { return await request; }
    catch (error) {
      if (current.mounted) setStatus(current.conflict
        ? 'Карточка уже изменена. Обновите страницу, чтобы восстановить свой ввод.'
        : locallyStored ? 'Не удалось сохранить в аккаунт. Ваш ввод сохранён на этом устройстве; повторите сохранение.'
        : 'Есть несохранённые изменения. Сохраните черновик перед выходом.');
      throw error;
    } finally { inFlight.current = null; }
  }

  const persistRef = useRef(persist);
  persistRef.current = persist;

  useEffect(() => {
    const current = state.current;
    current.mounted = true;
    try {
      const stored = JSON.parse(localStorage.getItem(key(current.id)) || 'null') as Backup | null;
      if (stored) {
        const parsed = listingDraftSchema.safeParse(stored.data);
        if (parsed.success && typeof stored.base === 'string' && /^[a-f0-9-]{36}$/.test(stored.draftId)) {
          current.draftId = stored.draftId;
          current.session = stored.session;
          if (JSON.stringify(parsed.data) === current.base) removeOwnBackup(current.id);
          else if (!listing || stored.base === current.base) {
            current.data = parsed.data;
            renderData(parsed.data);
            setStatus('Восстановлен незавершённый черновик');
          } else {
            // A different tab/device changed the server copy: require an explicit choice.
            current.conflict = true;
            setRecovery(parsed.data);
            setStatus('Есть несохранённый ввод с этого устройства. Карточка в аккаунте уже изменилась.');
          }
        }
      }
    } catch { /* Storage can be unavailable; server saving still works. */ }
    setReady(true);
    const flush = () => {
      if (!current.paused && !current.conflict && JSON.stringify(current.data) !== current.base) {
        void persistRef.current().catch(() => {});
      }
    };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      current.mounted = false;
      flush();
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', hidden);
    };
  // Each form is keyed to one listing and authenticated user by its server page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || paused || state.current.conflict || JSON.stringify(data) === state.current.base) return;
    const timer = window.setTimeout(() => { void persistRef.current().catch(() => {}); }, 1200);
    return () => window.clearTimeout(timer);
  }, [data, ready, paused]);

  return {
    data, setData, id, persist, status, recovery,
    setRevision: (revision: number) => { state.current.revision = revision; },
    restore: () => {
      if (!recovery) return;
      state.current.conflict = false;
      setData(recovery);
      setRecovery(null);
    },
    keepServer: () => {
      state.current.conflict = false;
      removeOwnBackup(state.current.id);
      setRecovery(null);
      setStatus('Сохранённая версия загружена');
    },
  };
}
