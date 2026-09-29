'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="container page"><div className="empty"><h1>Не удалось загрузить страницу</h1><p>Проверьте подключение к сервису и попробуйте ещё раз.</p><button className="button" onClick={reset}>Попробовать снова</button></div></div>;}
