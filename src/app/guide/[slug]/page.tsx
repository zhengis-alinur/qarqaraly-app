import { notFound } from 'next/navigation';
import { getArticle } from '@/lib/editorial';
import ArticlePage, { editorialMetadata } from '@/components/ArticlePage';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}) {const a=await getArticle((await params).slug);return a?editorialMetadata(a):{title:'Статья не найдена'};}
export default async function GuideArticle({params}:{params:Promise<{slug:string}>}) {const a=await getArticle((await params).slug);if(!a)notFound();return <ArticlePage article={a}/>;}
