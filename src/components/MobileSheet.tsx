'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslator } from './LocaleProvider';

export default function MobileSheet({ open, onClose, title, id, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  id: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();
  const t = useTranslator();

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 761px)');
    const dismissOnDesktop = () => { if (desktop.matches) close.current(); };
    desktop.addEventListener('change', dismissOnDesktop);
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener('change', dismissOnDesktop);
    };
  }, [open]);

  return <dialog ref={dialog} id={id} className="mobile-sheet" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="mobile-sheet-panel">
      <header className="mobile-sheet-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} autoFocus aria-label={t('Закрыть')}><X size={22} /></button>
      </header>
      <div className="mobile-sheet-content">{children}</div>
    </div>
  </dialog>;
}
