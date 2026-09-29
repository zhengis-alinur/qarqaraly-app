import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { taxonomy } from '@/lib/data';
import ListingForm from '@/components/ListingForm';
export default async function New(){const user=await requireUser();return <div className="container page narrow"><Link href="/dashboard" className="text-link">← Мои объекты</Link><ListingForm tax={await taxonomy()} verified={user.verified}/></div>;}
