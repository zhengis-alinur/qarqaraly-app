import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET(_:Request,{params}:{params:Promise<{name:string}>}) {const {name}=await params;if(!/^[a-f0-9-]+\.webp$/.test(name))return new Response(null,{status:404});try{const data=await readFile(path.join(path.resolve(process.env.UPLOAD_DIR||'uploads'),name));return new Response(data,{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});}catch{return new Response(null,{status:404});}}
