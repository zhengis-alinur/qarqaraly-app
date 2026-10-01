import { getTranslator } from '@/lib/i18n/server';
import { notFound } from 'next/navigation';
import PhoneAuth from '@/components/PhoneAuth';
import EmailLogin from '@/components/EmailLogin';
export const metadata={title:'Вход и регистрация',robots:{index:false,follow:false}};
// Владельцы объектов входят и регистрируются по номеру телефона. Служебный вход по email — /auth/login?email=1.
export default async function AuthPage({params,searchParams}:{params:Promise<{mode:string}>;searchParams:Promise<{email?:string}>}) {const translate=await getTranslator();
 const {mode}=await params;if(!['login','register','forgot'].includes(mode))notFound();
 if(mode==='login'&&(await searchParams).email)return <div className="container page"><EmailLogin/></div>;
 return <div className="container page"><PhoneAuth mode={mode}/></div>;
}
