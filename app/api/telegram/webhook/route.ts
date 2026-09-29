import { db } from "@/lib/db";
import { submitExpense, submitSale } from "@/lib/service";
import { telegram } from "@/lib/integrations";

export async function POST(request:Request){
  const secret=request.headers.get("x-telegram-bot-api-secret-token");
  if(!process.env.TELEGRAM_WEBHOOK_SECRET||secret!==process.env.TELEGRAM_WEBHOOK_SECRET)return new Response("Unauthorized",{status:401});
  const update=await request.json();const message=update.message;if(!message?.text||!message?.from?.id)return Response.json({ok:true});
  const chat=String(message.chat.id),user=String(message.from.id),text=String(message.text).trim();
  try{
    const {data:employee}=await db().from("employees").select("*").eq("telegram_user_id",user).maybeSingle();
    if(!employee){await telegram(chat,`Your Telegram ID is ${user}. It is not linked yet. Ask Svetlana to link it in Manager setup.`);return Response.json({ok:true});}
    await db().from("employees").update({telegram_chat_id:chat}).eq("slug",employee.slug);
    if(text==="/start"){await telegram(chat,`Linked as ${employee.name}. Use /help for formats.`);return Response.json({ok:true});}
    if(text==="/help"){await telegram(chat,"Sale: /sale S01 | Customer | A | Description | 1000 | 50/30/20\nExpense: /expense E01 | Description | Materials | 120 | A");return Response.json({ok:true});}
    if(text.startsWith("/sale ")){const [reference,customer,project,description,amount,rawSplit]=text.slice(6).split("|").map((x:string)=>x.trim());const [richard,anastasia,jeanClaude]=String(rawSplit).split("/").map(Number);await submitSale(employee.slug,{reference,customer,project,description,amount,richard,anastasia,jeanClaude},chat);return Response.json({ok:true});}
    if(text.startsWith("/expense ")){const [reference,description,category,amount,allocation]=text.slice(9).split("|").map((x:string)=>x.trim());await submitExpense(employee.slug,{reference,description,category,amount,allocation},chat);return Response.json({ok:true});}
    await telegram(chat,"Unknown command. Use /help.");
  }catch(e){await telegram(chat,`Not recorded: ${e instanceof Error?e.message:String(e)}`);}
  return Response.json({ok:true});
}
