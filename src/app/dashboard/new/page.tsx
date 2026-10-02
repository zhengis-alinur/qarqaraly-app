import { getTranslator } from '@/lib/i18n/server';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { taxonomy } from '@/lib/data';
import { payment } from '@/lib/payment';
import ListingForm from '@/components/ListingForm';
export default async function New(){const translate=await getTranslator();const user=await requireUser();return <div className="container page narrow"><Link href="/dashboard" className="text-link">{translate("← Мои объекты")}</Link><ListingForm userId={user._id} key={user._id} tax={await taxonomy()} verified={user.verified} payment={payment()}/></div>;}
