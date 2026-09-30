import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';
import type { User } from '../src/lib/types';
async function main(){const email=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw new Error('Укажите ADMIN_EMAIL');let password=process.env.ADMIN_PASSWORD||'';if(!password){const rl=createInterface({input:process.stdin,output:process.stdout});password=await rl.question('Пароль администратора (минимум 12 символов; ввод виден): ');rl.close();}if(password.length<12||password.length>72)throw new Error('Пароль должен содержать 12–72 символа');const users=(await db()).collection<User>('users');if(await users.findOne({email}))throw new Error('Пользователь с таким email уже существует. Изменение роли автоматически запрещено.');await users.insertOne({_id:randomUUID(),email,passwordHash:await bcrypt.hash(password,12),role:'admin',verified:true,sessionVersion:0});console.log('Администратор создан. Войдите через /auth/login?email=1 — это служебный вход по почте.');}
main().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});
