import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { taxonomy } from '@/lib/data';
import type { Listing } from '@/lib/types';
import ListingForm from '@/components/ListingForm';
export default async function Edit({params}:{params:Promise<{id:string}>}){const user=await requireUser();const l=await (await db()).collection<Listing>('listings').findOne({_id:(await params).id,...(user.role==='admin'?{}:{ownerId:user._id})});if(!l)notFound();return <div className="container page narrow"><Link href={user.role==='admin'?'/admin':'/dashboard'} className="text-link">← Назад в кабинет</Link><ListingForm listing={l} tax={await taxonomy()} verified={user.verified}/></div>;}
