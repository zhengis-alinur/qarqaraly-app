import { readFile, writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';
const picks: Record<string, [string,string]> = {
 city: ['File:Karkaraly Overlook.jpg','Панорама Каркаралинска'],
 winter: ['File:Karkaraly Snow.jpg','Каркаралинск зимой'],
 samal: ['File:Самал көлі Қарқаралы.JPG','Озеро Самал в Каркаралинске'],
 forest: ['File:Forest of Karkaraly.jpg','Лес Каркаралинского национального парка'],
 basin: ['File:Karkaraly National Park 7.jpg','Озеро Бассейн в Каркаралинском национальном парке'],
 kent: ['File:Karkaraly National Park 2.jpg','Кентские горы, Каркаралинский национальный парк'],
 ruins: ['File:Karkaraly National Park 6.jpg','Руины Кызылкентского дворца'],
 forester: ['File:Karkaraly24.jpg','Дом лесника в Комиссаровке'],
 shaitan: ['File:Shaitankol.jpg','Озеро Шайтанколь, Каркаралинский национальный парк'],
 mosque: ['File:Kunanbay Mosque.jpg','Мечеть Кунанбая в Каркаралинске'],
};
const pages: Record<string, any> = {};
for (const file of ['commons-sources.json','commons-park.json','commons-extra.json']) {
 const data=JSON.parse(await readFile(new URL(`../content/${file}`,import.meta.url),'utf8'));
 for (const p of Object.values(data.query.pages) as any[]) if(p.imageinfo)pages[p.title]=p;
}
const clean=(text:string)=>text.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').trim();
const out=new URL('./assets/editorial/',import.meta.url);await mkdir(out,{recursive:true});
const manifest:Record<string,unknown>=JSON.parse(await readFile(new URL('../content/editorial-photos.json',import.meta.url),'utf8').catch(()=>'{}'));
for(const [key,[title,caption]] of Object.entries(picks)) {
 if(manifest[key])continue;
 const info=pages[title]?.imageinfo?.[0];if(!info)throw new Error(`Missing metadata: ${title}`);
 const meta=info.extmetadata,license=clean(meta.LicenseShortName?.value||'');
 if(!/^CC (BY|BY-SA|0)/.test(license))throw new Error(`Unsupported license: ${title} ${license}`);
 await new Promise(resolve=>setTimeout(resolve,3000));
 let response=await fetch(info.url,{headers:{'User-Agent':'QarqaralyEditorial/1.0 (local tourism publication)'},signal:AbortSignal.timeout(45000)});
 if(response.status===429){await new Promise(resolve=>setTimeout(resolve,10000));response=await fetch(info.thumburl||info.url,{headers:{'User-Agent':'QarqaralyEditorial/1.0'},signal:AbortSignal.timeout(45000)});}
 if(!response.ok)throw new Error(`${title}: ${response.status}`);
 const buffer=await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(1600,1200,{fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
 await writeFile(new URL(`${key}.webp`,out),buffer);
 manifest[key]={caption,author:clean(meta.Artist?.value||'Автор указан на странице файла'),license,licenseUrl:meta.LicenseUrl?.value||'https://creativecommons.org/licenses/by-sa/4.0/',source:info.descriptionurl,original:info.url,changes:'Уменьшение размера, преобразование в WebP; кадрирование при показе'};
 console.log(`${key}: сохранено, ${license}`);
 await writeFile(new URL('../content/editorial-photos.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
}
