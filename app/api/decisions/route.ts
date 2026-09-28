import { decideExpense, decideSale } from "@/lib/service";

export async function POST(request:Request){
  try{const b=await request.json();const result=b.kind==="sale"?await decideSale(b.actor,b.reference,{richard:Number(b.richard),anastasia:Number(b.anastasia),jeanClaude:Number(b.jeanClaude)}):await decideExpense(b.actor,b.reference,b.allocation);return Response.json(result);}
  catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:400});}
}
