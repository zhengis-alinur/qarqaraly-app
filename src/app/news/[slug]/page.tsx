import { notFound } from 'next/navigation';
import { getArticle } from '@/lib/editorial';
import ArticlePage, { editorialMetadata } from '@/components/ArticlePage';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}) {const a=await getArticle((await params).slug,'news');return a?editorialMetadata(a):{title:'Новость не найдена'};}
export default async function NewsArticle({params}:{params:Promise<{slug:string}>}) {const a=await getArticle((await params).slug,'news');if(!a)notFound();return <ArticlePage article={a}/>;}
