import { randomUUID, createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '../src/lib/db';
import type { Article, PhotoCredit } from '../src/lib/types';

type Material = Omit<Article,'_id'|'cover'|'source'|'checkedAt'|'published'|'updatedAt'> & {photo:string};
async function main(){
 const database=await db();
 const manifest:Record<string,PhotoCredit>=JSON.parse(await readFile(new URL('../content/editorial-photos.json',import.meta.url),'utf8'));
 const directory=path.resolve(process.env.UPLOAD_DIR||'uploads');await mkdir(directory,{recursive:true});
 const urls:Record<string,string>={};
 for(const [key,credit] of Object.entries(manifest)){
  const buffer=await readFile(new URL(`./assets/editorial/${key}.webp`,import.meta.url));
  const name=`${createHash('sha256').update(buffer).digest('hex')}.webp`;
  await writeFile(path.join(directory,name),buffer);urls[key]=`/uploads/${name}`;
  await database.collection('photos').updateOne({url:urls[key]},{$setOnInsert:{url:urls[key],ownerId:'editorial',createdAt:new Date(),...credit}},{upsert:true});
 }
 const guides:Material[]=JSON.parse(await readFile(new URL('../content/articles.json',import.meta.url),'utf8'));
 const news:Material[]=JSON.parse(await readFile(new URL('../content/news.json',import.meta.url),'utf8'));
 let added=0;const now=new Date().toISOString();
 for(const material of [...guides,...news.map(n=>({...n,kind:'news' as const}))]){
  const {photo,...data}=material;
  if(!urls[photo]||!data.sources?.length)throw new Error(`Нет фото или источника: ${data.slug}`);
  const result=await database.collection<Article>('articles').updateOne({slug:data.slug},{$setOnInsert:{
   ...data,_id:randomUUID(),cover:urls[photo],photoCredit:manifest[photo],source:data.sources[0].url,
   checkedAt:'2026-09-30',publishedAt:now,published:true,updatedAt:now,
  }},{upsert:true});added+=result.upsertedCount;
 }
 console.log(`Добавлено материалов: ${added}. В наборе: ${guides.length} статей и ${news.length} новости. Существующие публикации не перезаписаны.`);
}
main().then(()=>process.exit(0)).catch(error=>{console.error(error.message);process.exit(1);});
