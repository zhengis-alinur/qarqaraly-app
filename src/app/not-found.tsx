import Link from 'next/link';
export default function NotFound(){return <div className="container page"><div className="empty"><span className="eyebrow">404 · СБИЛИСЬ С ТРОПЫ</span><h1>Здесь пока нет страницы</h1><p>Возможно, объект снят с публикации или ссылка изменилась.</p><Link className="button" href="/catalog">Вернуться в каталог</Link></div></div>;}
