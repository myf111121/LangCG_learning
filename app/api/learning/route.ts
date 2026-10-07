import {getChatGPTUser} from '@/app/chatgpt-auth';
import {storage} from '@/db/storage';
import {allLessons,phases} from '@/app/curriculum';
export const dynamic='force-dynamic';
const validIds=new Set([...allLessons.map(l=>l.id),...phases.map(p=>'lab-'+p.week),'journal']);
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({error:'请登录 ChatGPT 后保存学习记录。'},401);
 try{const rows=await storage().prepare('SELECT item_id, completed, note, code, updated_at FROM learning_records WHERE user_id = ?').bind(user.userId).all();return json({records:rows.results})}
 catch(error){console.error('Load learning records failed',error);return json({error:'暂时无法读取学习记录，请重试。'},503)}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'请登录 ChatGPT 后保存学习记录。'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'请求来源无效。'},403);
 try{
  const body=await request.json() as {id?:unknown;completed?:unknown;note?:unknown;code?:unknown};
  if(typeof body.id!=='string'||!validIds.has(body.id))return json({error:'任务不存在。'},400);
  if(body.completed!==undefined&&typeof body.completed!=='boolean')return json({error:'任务状态无效。'},400);
  if(body.note!==undefined&&(typeof body.note!=='string'||body.note.length>20000))return json({error:'笔记最多 20,000 字符。'},400);
  if(body.code!==undefined&&(typeof body.code!=='string'||body.code.length>20000))return json({error:'代码最多 20,000 字符。'},400);
  if(body.completed===undefined&&body.note===undefined&&body.code===undefined)return json({error:'没有需要保存的变更。'},400);
  const now=new Date().toISOString();
  await storage().prepare('INSERT INTO learning_records (user_id,item_id,completed,note,code,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,item_id) DO UPDATE SET completed=CASE WHEN ? THEN excluded.completed ELSE learning_records.completed END,note=CASE WHEN ? THEN excluded.note ELSE learning_records.note END,code=CASE WHEN ? THEN excluded.code ELSE learning_records.code END,updated_at=excluded.updated_at').bind(user.userId,body.id,body.completed?1:0,body.note??'',body.code??'',now,body.completed!==undefined?1:0,body.note!==undefined?1:0,body.code!==undefined?1:0).run();
  return json({ok:true,updated_at:now});
 }catch(error){console.error('Save learning record failed',error);return json({error:'保存失败，输入仍保留在页面中，请重试。'},503)}
}
