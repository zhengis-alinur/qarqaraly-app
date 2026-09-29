import { db } from './db';
import type { Article } from './types';
export const sectionLabels: Record<string,string> = {sights:'Места, которые стоит увидеть',routes:'Готовые планы поездки',tips:'Советы для путешествия'};
export const areaLabels: Record<string,string> = {city:'В городе',park:'Национальный парк',kent:'Кентские горы'};
export const articleUrl=(a:Pick<Article,'kind'|'slug'>)=>`/${a.kind==='news'?'news':'guide'}/${a.slug}`;
export const readingMinutes=(body:string)=>Math.max(2,Math.ceil(body.split(/\s+/).length/150));
export async function getArticle(slug:string,kind:'guide'|'news'='guide') {return (await db()).collection<Article>('articles').findOne({slug,published:true,kind:kind==='news'?'news':{$ne:'news'}});}
export async function newsArticles(){return (await db()).collection<Article>('articles').find({published:true,kind:'news'}).sort({sourcePublishedAt:-1,publishedAt:-1}).toArray();}
export async function relatedArticles(article:Article) {return (await db()).collection<Article>('articles').find({published:true,slug:{$in:article.related||[]}}).toArray();}
