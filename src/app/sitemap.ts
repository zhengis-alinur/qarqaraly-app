import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { siteUrl } from '@/lib/data';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const database=await db();const [places,articles]=await Promise.all([database.collection('listings').find({published:{$ne:null},demo:{$ne:true}},{projection:{slug:1,updatedAt:1}}).toArray(),database.collection('articles').find({published:true},{projection:{slug:1,updatedAt:1,kind:1}}).toArray()]);return [...['','/catalog','/map','/guide','/sights','/news','/privacy'].map(p=>({url:`${siteUrl()}${p}`})),...places.map(p=>({url:`${siteUrl()}/places/${p.slug}`,lastModified:new Date(p.updatedAt)})),...articles.map(p=>({url:`${siteUrl()}/${p.kind==='news'?'news':'guide'}/${p.slug}`,lastModified:new Date(p.updatedAt)}))];}
