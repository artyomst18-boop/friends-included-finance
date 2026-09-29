import { actor, db, requireRole } from "@/lib/db";

export async function POST(request:Request){
  try{const b=await request.json();const manager=await actor(b.actor);requireRole(manager,"manager");await actor(b.employee);const telegramUserId=String(b.telegramUserId??"").trim()||null;const telegramChatId=String(b.telegramChatId??"").trim()||null;const client=db();if(telegramUserId){const {error:unlinkError}=await client.from("employees").update({telegram_user_id:null,telegram_chat_id:null}).eq("telegram_user_id",telegramUserId).neq("slug",b.employee);if(unlinkError)throw unlinkError;}const {data,error}=await client.from("employees").update({telegram_user_id:telegramUserId,telegram_chat_id:telegramChatId}).eq("slug",b.employee).select().single();if(error)throw error;return Response.json(data);}
  catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:400});}
}
