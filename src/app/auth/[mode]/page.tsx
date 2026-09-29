import { notFound } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
export const metadata={title:'Вход и регистрация',robots:{index:false,follow:false}};
export default async function AuthPage({params,searchParams}:{params:Promise<{mode:string}>;searchParams:Promise<{token?:string}>}) {const {mode}=await params;if(!['login','register','forgot','reset','verify','resend'].includes(mode))notFound();return <div className="container page"><AuthForm mode={mode} token={(await searchParams).token||''}/></div>;}
