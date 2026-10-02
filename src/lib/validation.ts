import { z } from 'zod';
import { emptyListing } from './types';
const text=(max:number)=>z.string().trim().max(max);
const url=z.union([z.literal(''),z.url().refine(s=>/^https?:\/\//.test(s),'Используйте http или https')]);
// Drafts preserve unfinished input, including spaces, partial contacts and one coordinate.
// Keep type/size limits and upload-path validation; completeness is checked on submission.
export const listingDraftSchema=z.object({
 title:z.string().max(120),category:z.string().max(80),description:z.string().max(10000),address:z.string().max(300),
 price:z.number().nullable(),priceUnit:z.string().max(80),amenities:z.array(z.string().max(80)).max(30),
 phone:z.string().max(30),whatsapp:z.string().max(30),website:z.string().max(2000),social:z.string().max(2000),
 conditions:z.string().max(5000),hours:z.string().max(500),lat:z.number().nullable(),lng:z.number().nullable(),
 photos:z.array(z.object({url:z.string().regex(/^\/uploads\/[a-f0-9-]+\.webp$/),caption:z.string().max(200)})).max(10),
}).partial().transform(value=>({...emptyListing,...value}));
export const listingSchema=z.object({title:text(120).min(3),category:text(80).min(1),description:text(10000).min(30),address:text(300).min(3),price:z.number().min(0).max(100000000).nullable(),priceUnit:z.enum(['за ночь','за человека','за час','за услугу']),amenities:z.array(text(80)).max(30),phone:text(30).refine(s=>!s||/^\+?[\d\s()-]{7,25}$/.test(s),'Неверный телефон'),whatsapp:text(30).refine(s=>!s||/^\+?[\d\s()-]{7,25}$/.test(s),'Неверный WhatsApp'),website:url,social:url,conditions:text(5000),hours:text(500),lat:z.number().min(-90).max(90).nullable(),lng:z.number().min(-180).max(180).nullable(),photos:z.array(z.object({url:z.string().regex(/^\/uploads\/[a-f0-9-]+\.webp$/),caption:text(200)})).max(10)}).refine(v=>(v.lat===null)===(v.lng===null),'Укажите обе координаты');
export const articleSchema=z.object({kind:z.enum(['guide','news']).default('guide'),section:z.enum(['sights','routes','tips']).default('tips'),sourcePublishedAt:z.union([z.literal(''),z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),sources:z.array(z.object({label:text(200).min(1),url:z.url().refine(s=>/^https?:\/\//.test(s))})).max(12).optional(),slug:z.string().regex(/^[a-z0-9-]{3,100}$/),title:text(180).min(5),summary:text(500).min(10),body:text(40000).min(30),cover:z.union([z.literal(''),z.string().regex(/^\/uploads\/[a-f0-9-]+\.webp$/)]),source:url,checkedAt:z.union([z.literal(''),z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),published:z.boolean()}).refine(a=>!a.published||Boolean(a.source&&a.checkedAt),'Для публикации укажите источник и дату проверки').refine(a=>a.kind!=='news'||!a.published||Boolean(a.sourcePublishedAt),'Для новости укажите дату сообщения источника');
