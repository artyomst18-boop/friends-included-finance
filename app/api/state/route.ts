import { db } from "@/lib/db";
import { calculateDashboard } from "@/lib/rules";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const client = db();
    const [sales,expenses,employees]=await Promise.all([
      client.from("sales").select("*").order("submitted_at",{ascending:false}),
      client.from("expenses").select("*").order("submitted_at",{ascending:false}),
      client.from("employees").select("slug,name,role,telegram_user_id,telegram_chat_id").order("name")
    ]);
    const error=sales.error||expenses.error||employees.error; if(error) throw error;
    return Response.json({sales:sales.data,expenses:expenses.data,employees:employees.data,dashboard:calculateDashboard(sales.data,expenses.data)});
  } catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:500});}
}
