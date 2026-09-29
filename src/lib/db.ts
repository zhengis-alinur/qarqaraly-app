import { MongoClient } from 'mongodb';
import { defaultAmenities, defaultCategories } from './types';
const globalDb = globalThis as unknown as {mongo?: Promise<MongoClient>; indexes?: Promise<void>};
export async function db() {
 if (!globalDb.mongo) globalDb.mongo = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/qarqaraly', {serverSelectionTimeoutMS:5000}).connect().catch(e=>{globalDb.mongo=undefined;throw e;});
 const database = (await globalDb.mongo).db();
 if (!globalDb.indexes) globalDb.indexes = (async()=>{
  await Promise.all([
   database.collection('users').createIndex({email:1},{unique:true}),
   database.collection('listings').createIndex({slug:1},{unique:true}),
   database.collection('listings').createIndex({status:1,'published.category':1,'published.price':1,updatedAt:-1}),
   database.collection('listings').createIndex({ownerId:1}),
   database.collection('articles').createIndex({slug:1},{unique:true}),
   database.collection('tokens').createIndex({hash:1},{unique:true}),
   database.collection('tokens').createIndex({expiresAt:1},{expireAfterSeconds:0}),
   database.collection('limits').createIndex({expiresAt:1},{expireAfterSeconds:0}),
   database.collection('events').createIndex({listingId:1,createdAt:1}),
   database.collection('events').createIndex({dedupe:1},{unique:true}),
  ]);
  const tax = database.collection<{_id:string;name:string;kind:string;order:number}>('taxonomy');
  for (const [order,c] of defaultCategories.entries()) await tax.updateOne({_id:c._id},{$setOnInsert:{...c,kind:'category',order}},{upsert:true});
  for (const [order,name] of defaultAmenities.entries()) await tax.updateOne({_id:`amenity-${order}`},{$setOnInsert:{name,kind:'amenity',order}},{upsert:true});
 })().catch(e=>{globalDb.indexes=undefined;throw e;});
 await globalDb.indexes;
 return database;
}
