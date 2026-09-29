import { db } from './db';
import type { Listing, PublicListing, Taxonomy, Article } from './types';
export const siteUrl = () => process.env.APP_URL || 'http://localhost:3000';
export async function taxonomy() {return (await db()).collection<Taxonomy>('taxonomy').find().sort({order:1}).toArray();}
export const toPublic=(l:Listing):PublicListing=>({...l.published!,id:l._id,slug:l.slug,confirmedAt:l.confirmedAt,updatedAt:l.updatedAt,demo:l.demo});
export async function catalog(params:Record<string,string|undefined>={},all=false) {
 const filter:Record<string,unknown>={published:{$ne:null}};
 if(params.category)filter['published.category']=params.category;
 if(params.q)filter['published.title']={$regex:params.q.slice(0,100).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'};
 const min=Number(params.min),max=Number(params.max);
 if(params.min || params.max)filter['published.price']={$ne:null,...(params.min && Number.isFinite(min)?{$gte:min}:{}),...(params.max && Number.isFinite(max)?{$lte:max}:{})};
 if(params.amenities)filter['published.amenities']={$all:params.amenities.split(',').slice(0,20)};
 const collection=(await db()).collection<Listing>('listings');
 const page=Math.max(1,Math.min(10000,Number(params.page)||1));
 // Keep unknown prices at the end in both price sort directions.
 const sort:Record<string,1|-1>=params.sort==='price-asc'?{noPrice:1,'published.price':1,_id:1}:params.sort==='price-desc'?{noPrice:1,'published.price':-1,_id:1}:{updatedAt:-1,_id:1};
 const total=await collection.countDocuments(filter);
 const items=await collection.aggregate<Listing>([{$match:filter},{$addFields:{noPrice:{$cond:[{$eq:['$published.price',null]},1,0]}}},{$sort:sort},...(!all?[{$skip:(page-1)*9},{$limit:9}]:[])]).toArray();
 return {items:items.map(toPublic),total,page,pages:Math.ceil(total/9)};
}
export async function publicListing(slug:string) {const l=await (await db()).collection<Listing>('listings').findOne({slug,published:{$ne:null}});return l?toPublic(l):null;}
export async function articles() {return (await db()).collection<Article>('articles').find({published:true,kind:{$ne:'news'}}).sort({editorialOrder:1,updatedAt:-1}).toArray();}
export const priceLabel=(l:{price:number|null;priceUnit:string})=>l.price===null?'Стоимость уточняйте':`${new Intl.NumberFormat('ru-RU').format(l.price)} ₸ ${l.priceUnit}`;
export const dateLabel=(s:string)=>new Date(s).toLocaleDateString('ru-RU');
