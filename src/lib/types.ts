export type Status = 'draft' | 'pending' | 'published' | 'changes' | 'archived';
export type Photo = { url: string; caption: string };
export type ListingData = {
 title: string; category: string; description: string; address: string; price: number | null;
 priceUnit: string; amenities: string[]; phone: string; whatsapp: string; website: string;
 social: string; conditions: string; hours: string; lat: number | null; lng: number | null; photos: Photo[];
};
// Заявленная владельцем оплата: подтверждения от банка нет, поступление сверяется по выписке.
export type PaymentClaim = { payerName: string; amount: number | null; method: string; claimedAt: string };
export type Listing = { _id: string; slug: string; ownerId: string; draft: ListingData; published: ListingData | null; status: Status; feedback: string; confirmedAt: string | null; updatedAt: string; createdAt: string; revision: number; demo?: boolean; payment?: PaymentClaim; approvedAt?: string };
export type PublicListing = ListingData & { id: string; slug: string; confirmedAt: string | null; updatedAt: string; demo?: boolean };
export type User = { _id: string; email?: string; phone?: string; passwordHash: string; role: 'business' | 'admin'; verified: boolean; sessionVersion: number };
// Одноразовый SMS-код: сам код не хранится, только HMAC. Строки одновременно служат журналом лимитов «сколько кодов запросил номер или IP за час».
export type Otp = { _id: string; phone: string; ip: string; codeHash: string; attempts: number; expiresAt: Date; consumedAt: Date | null; createdAt: Date };
export type Taxonomy = { _id: string; name: string; kind: 'category' | 'amenity'; order: number };
export type ArticleSource = { label: string; url: string };
export type PhotoCredit = { caption: string; author: string; source: string; license: string; licenseUrl: string; changes: string };
export type Article = {
 _id: string; slug: string; title: string; summary: string; body: string; cover: string;
 source: string; checkedAt: string; published: boolean; updatedAt: string;
 kind?: 'guide' | 'news'; section?: 'sights' | 'routes' | 'tips';
 sources?: ArticleSource[]; photoCredit?: PhotoCredit; publishedAt?: string; sourcePublishedAt?: string;
 editorialOrder?: number; area?: 'city' | 'park' | 'kent' | null; related?: string[];
};
export const statusLabels: Record<Status,string> = { draft:'Черновик',pending:'На проверке',published:'Опубликован',changes:'Требует исправлений',archived:'Архив' };
export const defaultCategories = [{_id:'stay',name:'Где остановиться'},{_id:'food',name:'Где поесть'},{_id:'activities',name:'Чем заняться'},{_id:'transport',name:'Транспорт и прокат'},{_id:'shops',name:'Магазины'},{_id:'recreation',name:'Зоны отдыха'},{_id:'kumys',name:'Где купить кымыз'},{_id:'sights',name:'Достопримечательности'},{_id:'city',name:'Важные точки города'}];
export const defaultAmenities = ['Wi-Fi','Парковка','Питание','Можно с детьми','Можно с животными'];
export const emptyListing: ListingData = {title:'',category:'stay',description:'',address:'',price:null,priceUnit:'за ночь',amenities:[],phone:'',whatsapp:'',website:'',social:'',conditions:'',hours:'',lat:null,lng:null,photos:[]};
