'use client';

import { useEffect, useId, useRef, useState, type MouseEvent, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, Expand, ImageOff, Images, Mountain, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslator } from '@/components/LocaleProvider';
import type { Photo } from '@/lib/types';
import styles from './PlaceGallery.module.css';

function GalleryImage({ photo, title, priority = false }: { photo: Photo; title: string; priority?: boolean }) {
  const translate = useTranslator();
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className={styles.imageError} role="img" aria-label={translate('Не удалось загрузить фото')}>
      <ImageOff size={30} aria-hidden="true" />
      <span>{translate('Не удалось загрузить фото')}</span>
    </span>
  ) : <img src={photo.url} alt={translate(photo.caption || title)} draggable={false}
    loading={priority ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />;
}

function useSwipe(onSwipe: (direction: number) => void, enabled = true) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  return {
    onTouchStart(event: TouchEvent) {
      swiped.current = false;
      start.current = enabled && event.touches.length === 1
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    },
    onTouchMove(event: TouchEvent) {
      if (event.touches.length !== 1) start.current = null;
    },
    onTouchEnd(event: TouchEvent) {
      if (!start.current || !enabled) return;
      const dx = event.changedTouches[0].clientX - start.current.x;
      const dy = event.changedTouches[0].clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        swiped.current = true;
        onSwipe(dx < 0 ? 1 : -1);
      }
    },
    onTouchCancel() { start.current = null; },
    onClickCapture(event: MouseEvent) {
      if (swiped.current) {
        event.preventDefault();
        event.stopPropagation();
        swiped.current = false;
      }
    },
  };
}

function Thumbnails({ photos, selected, onSelect, title }: {
  photos: Photo[]; selected: number; onSelect: (index: number) => void; title: string;
}) {
  const translate = useTranslator();
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = rail.current;
    const active = container?.children[selected] as HTMLElement | undefined;
    if (!container || !active) return;
    // Scroll only the thumbnail rail; never move the page or the dialog.
    container.scrollTo({ left: active.offsetLeft - container.offsetLeft - (container.clientWidth - active.clientWidth) / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [selected]);
  return <div className={styles.thumbnails} ref={rail} aria-label={translate('Выбрать фотографию')}>
    {photos.map((photo, index) => <button type="button" key={`${photo.url}-${index}`}
      className={styles.thumbnail} aria-pressed={selected === index}
      aria-label={`${translate('Фото')} ${index + 1}: ${translate(photo.caption || title)}`}
      onClick={() => onSelect(index)}>
      <img src={photo.url} alt="" loading="lazy" decoding="async" draggable={false} />
      <span>{index + 1}</span>
    </button>)}
  </div>;
}

function PhotoViewer({ photos, selected, onSelect, title, onClose }: {
  photos: Photo[]; selected: number; onSelect: (index: number) => void; title: string; onClose: () => void;
}) {
  const translate = useTranslator();
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [zoomed, setZoomed] = useState(false);
  const move = (direction: number) => {
    setZoomed(false);
    onSelect((selected + direction + photos.length) % photos.length);
  };
  const swipe = useSwipe(move, !zoomed && photos.length > 1);

  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const previous = { position: bodyStyle.position, top: bodyStyle.top, width: bodyStyle.width, overflow: bodyStyle.overflow };
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    Object.assign(bodyStyle, { position: 'fixed', top: `-${scrollY}px`, width: '100%', overflow: 'hidden' });
    return () => {
      element.close();
      Object.assign(bodyStyle, previous);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => { viewport.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [selected, zoomed]);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      if (event.altKey || event.ctrlKey || event.metaKey || zoomed) return;
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'Home') onSelect(0);
        else if (event.key === 'End') onSelect(photos.length - 1);
        else move(event.key === 'ArrowRight' ? 1 : -1);
      }
    }}>
    <div className={styles.viewer}>
      <header className={styles.viewerHeader}>
        <div className={styles.viewerHeading}><span>{translate('Фотографии объекта')}</span><strong id={titleId}>{title}</strong></div>
        <span className={styles.viewerCount}>{selected + 1} / {photos.length}</span>
        <button type="button" className={styles.control} aria-label={translate(zoomed ? 'Уменьшить фото' : 'Увеличить фото')}
          aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>{zoomed ? <ZoomOut size={21} /> : <ZoomIn size={21} />}</button>
        <button type="button" className={styles.control} ref={closeButton} aria-label={translate('Закрыть просмотр')} onClick={onClose}><X size={24} /></button>
      </header>
      <div className={styles.viewerStage}>
        <div ref={viewport} className={`${styles.viewport} ${zoomed ? styles.zoomed : ''}`} {...swipe}>
          <div className={styles.photoCanvas}>
            <GalleryImage key={photos[selected].url} photo={photos[selected]} title={title} priority />
          </div>
        </div>
        {photos.length > 1 && <>
          <button type="button" className={`${styles.control} ${styles.previous}`} aria-label={translate('Предыдущее фото')} onClick={() => move(-1)}><ChevronLeft size={25} /></button>
          <button type="button" className={`${styles.control} ${styles.next}`} aria-label={translate('Следующее фото')} onClick={() => move(1)}><ChevronRight size={25} /></button>
        </>}
      </div>
      <footer className={styles.viewerFooter}>
        <p className={styles.viewerCaption} aria-live="polite" aria-atomic="true">
          <span className={styles.srOnly}>{translate('Фото')} {selected + 1} / {photos.length}. </span>
          {translate(photos[selected].caption || title)}
        </p>
        {photos.length > 1 && <Thumbnails photos={photos} selected={selected} title={title} onSelect={index => { setZoomed(false); onSelect(index); }} />}
      </footer>
    </div>
  </dialog>;
}

export default function PlaceGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const translate = useTranslator();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const selected = Math.min(index, Math.max(0, photos.length - 1));
  const move = (direction: number) => setIndex((selected + direction + photos.length) % photos.length);
  const swipe = useSwipe(move, photos.length > 1);

  if (!photos.length) return <div className={styles.empty}>
    <Mountain size={48} strokeWidth={1.3} aria-hidden="true" />
    <strong>{translate('Фотографии скоро появятся')}</strong>
    <span>{translate('Владелец пока не добавил фотографии')}</span>
  </div>;

  return <section className={styles.gallery} aria-label={translate('Фотографии объекта')}>
    <div className={styles.stage} {...swipe}>
      <button type="button" className={styles.openPhoto} onClick={() => setOpen(true)} aria-label={translate('Открыть фото на весь экран')}>
        <span className={styles.backdrop} aria-hidden="true" style={{ backgroundImage: `url(${JSON.stringify(photos[selected].url)})` }} />
        <GalleryImage key={photos[selected].url} photo={photos[selected]} title={title} priority />
        <span className={styles.expand}><Expand size={17} />{translate('На весь экран')}</span>
      </button>
      <span className={styles.counter}><Images size={16} />{selected + 1} / {photos.length}</span>
      {photos.length > 1 && <>
        <button type="button" className={`${styles.control} ${styles.previous}`} aria-label={translate('Предыдущее фото')} onClick={() => move(-1)}><ChevronLeft size={24} /></button>
        <button type="button" className={`${styles.control} ${styles.next}`} aria-label={translate('Следующее фото')} onClick={() => move(1)}><ChevronRight size={24} /></button>
      </>}
    </div>
    <div className={styles.details}>
      <p aria-live="polite" aria-atomic="true"><span className={styles.photoNumber}>{String(selected + 1).padStart(2, '0')}</span>{translate(photos[selected].caption || title)}</p>
      {photos.length > 1 && <span className={styles.hint}>{translate('Выберите фото или листайте')}</span>}
    </div>
    {photos.length > 1 && <Thumbnails photos={photos} selected={selected} onSelect={setIndex} title={title} />}
    {open && <PhotoViewer photos={photos} selected={selected} onSelect={setIndex} title={title} onClose={() => setOpen(false)} />}
  </section>;
}
