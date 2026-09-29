import { actor, db } from "@/lib/db";
import { calculateDashboard } from "@/lib/rules";
import { employeeState } from "@/lib/state-privacy";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("actor");
    if (!slug) return Response.json({ error: "Demonstration role is required." }, { status: 400 });
    const employee = await actor(slug);
    const client = db();
    if (employee.role !== "manager") {
      const [sales, expenses] = await Promise.all([
        employee.role === "salesperson"
          ? client.from("sales").select("*").eq("salesperson", employee.slug).order("submitted_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        employee.role === "expense_reporter"
          ? client.from("expenses").select("*").eq("reporter", employee.slug).order("submitted_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);
      const error = sales.error || expenses.error;
      if (error) throw error;
      return Response.json(employeeState(employee, sales.data ?? [], expenses.data ?? []));
    }
    const [sales,expenses,employees]=await Promise.all([
      client.from("sales").select("*").order("submitted_at",{ascending:false}),
      client.from("expenses").select("*").order("submitted_at",{ascending:false}),
      client.from("employees").select("slug,name,role,telegram_user_id,telegram_chat_id").order("name")
    ]);
    const error=sales.error||expenses.error||employees.error; if(error) throw error;
    return Response.json({actor:{slug:employee.slug,name:employee.name,role:employee.role},sales:sales.data,expenses:expenses.data,employees:employees.data,dashboard:calculateDashboard(sales.data,expenses.data)});
  } catch(e){const message=e instanceof Error?e.message:String(e);return Response.json({error:message},{status:message==="Unknown demonstration role."?400:500});}
}
