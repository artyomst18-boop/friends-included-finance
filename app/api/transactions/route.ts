import { submitExpense, submitSale } from "@/lib/service";

export async function POST(request:Request){
  try{const body=await request.json();if(body.kind==="sale") return Response.json(await submitSale(body.actor,body));if(body.kind==="expense") return Response.json(await submitExpense(body.actor,body));throw new Error("Unknown transaction type.");}
  catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:400});}
}
