import { retry } from "@/lib/service";
export async function POST(request:Request){try{const b=await request.json();return Response.json(await retry(b.actor,b.kind,b.reference,b.target));}catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:400});}}
