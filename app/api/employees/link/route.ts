import { actor, db, requireRole } from "@/lib/db";

export async function POST(request:Request){
  try{const b=await request.json();const manager=await actor(b.actor);requireRole(manager,"manager");await actor(b.employee);const {data,error}=await db().from("employees").update({telegram_user_id:String(b.telegramUserId).trim()||null,telegram_chat_id:String(b.telegramChatId??"").trim()||null}).eq("slug",b.employee).select().single();if(error)throw error;return Response.json(data);}
  catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:400});}
}
