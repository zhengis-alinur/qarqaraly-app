import { getTranslator } from '@/lib/i18n/server';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
export const metadata={title:'Кабинет бизнеса',robots:{index:false,follow:false}};
export default async function DashboardLayout({children}:{children:React.ReactNode}){const translate=await getTranslator();if(!await currentUser())redirect('/auth/login');return children;}
