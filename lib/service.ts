import { actor, db, requireRole } from "./db";
import { commissions, cents, money, validateReference, validateSplit } from "./rules";
import { markSyncFailure, syncExpense, syncSale, telegram } from "./integrations";
import type { Allocation, EmployeeSlug, Expense, Project, Sale, Split } from "./types";

const required = (v: unknown, name: string) => { const x = String(v ?? "").trim(); if (!x) throw new Error(`${name} is required.`); return x; };
const project = (v: unknown): Project => { if (v !== "A" && v !== "B") throw new Error("Project must be A or B."); return v; };
const allocation = (v: unknown): Allocation => { if (!["A","B","Company overhead"].includes(String(v))) throw new Error("Invalid allocation."); return v as Allocation; };

async function origin(employee: any, chatId?: string | null) { return chatId ?? employee.telegram_chat_id ?? null; }

async function recordNotification(kind: "sale" | "expense", data: any, status: "sent" | "failed", error: unknown = null) {
  const table = kind === "sale" ? "sales" : "expenses";
  const notificationError = error ? String(error).slice(0, 500) : null;
  await db().from(table).update({ notification_status: status, notification_error: notificationError }).eq("reference", data.reference);
  const updated = { ...data, notification_status: status, notification_error: notificationError };
  try { if (kind === "sale") await syncSale(updated); else await syncExpense(updated); }
  catch (syncError) { await markSyncFailure(table, data.reference, syncError); }
}

export async function submitSale(slug: string, input: any, chatId?: string | null) {
  const employee = await actor(slug); requireRole(employee, "salesperson");
  const split = validateSplit({ richard: Number(input.richard), anastasia: Number(input.anastasia), jeanClaude: Number(input.jeanClaude) });
  const record = {
    reference: validateReference(input.reference,"sale"), salesperson: employee.slug, originating_chat_id: await origin(employee, chatId),
    customer: required(input.customer,"Customer"), project: project(input.project), description: required(input.description,"Description"), amount_cents: cents(input.amount),
    proposed_richard_pct: split.richard, proposed_anastasia_pct: split.anastasia, proposed_jean_claude_pct: split.jeanClaude,
    sheet_sync_status: "pending", notification_status: (await origin(employee, chatId)) ? "pending" : "not_required"
  };
  const { data, error } = await db().from("sales").insert(record).select().single();
  if (error) throw new Error(error.code === "23505" ? "That reference already exists." : error.message);
  try { await syncSale(data); } catch (e) { await markSyncFailure("sales", data.reference, e); }
  if (data.originating_chat_id) { try { await telegram(data.originating_chat_id, `Sale ${data.reference} recorded: ${money(data.amount_cents)}, project ${data.project}, Pending approval.`); await recordNotification("sale",data,"sent"); } catch(e) { await recordNotification("sale",data,"failed",e); } }
  return data as Sale;
}

export async function submitExpense(slug: string, input: any, chatId?: string | null) {
  const employee = await actor(slug); requireRole(employee, "expense_reporter");
  const proposed = allocation(input.allocation); const overhead = proposed === "Company overhead";
  const record = {
    reference: validateReference(input.reference,"expense"), reporter: employee.slug, originating_chat_id: await origin(employee, chatId),
    description: required(input.description,"Description"), category: input.category, amount_cents: cents(input.amount), proposed_allocation: proposed,
    final_allocation: overhead ? proposed : null, status: overhead ? "Allocated" : "Awaiting allocation", sheet_sync_status: "pending", notification_status: (await origin(employee, chatId)) ? "pending" : "not_required"
  };
  if (!["Materials","Travel","Other"].includes(record.category)) throw new Error("Invalid expense category.");
  const { data, error } = await db().from("expenses").insert(record).select().single();
  if (error) throw new Error(error.code === "23505" ? "That reference already exists." : error.message);
  try { await syncExpense(data); } catch (e) { await markSyncFailure("expenses", data.reference, e); }
  if (data.originating_chat_id) { try { await telegram(data.originating_chat_id, `Expense ${data.reference} recorded: ${money(data.amount_cents)}, proposed ${data.proposed_allocation}, ${data.status}.`); await recordNotification("expense",data,"sent"); } catch(e) { await recordNotification("expense",data,"failed",e); } }
  return data as Expense;
}

export async function decideSale(slug: string, reference: string, split: Split) {
  const manager = await actor(slug); requireRole(manager, "manager"); validateSplit(split);
  const client = db(); const { data: before, error: readError } = await client.from("sales").select("*").eq("reference", reference).single();
  if (readError || !before) throw new Error("Sale not found.");
  if (before.status === "Approved") return { record: before, duplicate: true };
  const c = commissions(before.amount_cents, split);
  const changed = split.richard !== before.proposed_richard_pct || split.anastasia !== before.proposed_anastasia_pct || split.jeanClaude !== before.proposed_jean_claude_pct;
  const patch = { approved_richard_pct: split.richard, approved_anastasia_pct: split.anastasia, approved_jean_claude_pct: split.jeanClaude, richard_commission_cents: c.richard, anastasia_commission_cents: c.anastasia, jean_claude_commission_cents: c.jeanClaude, commission_pool_cents: c.pool, status: "Approved", approved_at: new Date().toISOString(), decision_changed: changed, sheet_sync_status: "pending", notification_status: before.originating_chat_id ? "pending" : "not_required" };
  const { data, error } = await client.from("sales").update(patch).eq("reference", reference).eq("status","Pending approval").select().maybeSingle();
  if (error) throw new Error(error.message); if (!data) { const latest = await client.from("sales").select("*").eq("reference",reference).single(); return { record: latest.data, duplicate: true }; }
  try { await syncSale(data); } catch (e) { await markSyncFailure("sales", reference, e); }
  if (data.originating_chat_id) {
    const text = `Sale ${reference} approved${changed ? " — commission split changed" : ""}. Sale ${money(data.amount_cents)}; total commission ${money(c.pool)}. Richard: ${before.proposed_richard_pct}% → ${split.richard}% (${money(c.richard)}). Anastasia: ${before.proposed_anastasia_pct}% → ${split.anastasia}% (${money(c.anastasia)}). Jean-Claude: ${before.proposed_jean_claude_pct}% → ${split.jeanClaude}% (${money(c.jeanClaude)}).`;
    try { await telegram(data.originating_chat_id,text); await recordNotification("sale",data,"sent"); } catch (e) { await recordNotification("sale",data,"failed",e); }
  }
  return { record: data, duplicate: false };
}

export async function decideExpense(slug: string, reference: string, finalAllocation: Allocation) {
  const manager = await actor(slug); requireRole(manager,"manager"); allocation(finalAllocation);
  const client=db(); const {data:before,error:readError}=await client.from("expenses").select("*").eq("reference",reference).single();
  if(readError||!before) throw new Error("Expense not found."); if(before.status==="Allocated") return {record:before,duplicate:true};
  const changed=finalAllocation!==before.proposed_allocation;
  const {data,error}=await client.from("expenses").update({final_allocation:finalAllocation,status:"Allocated",allocated_at:new Date().toISOString(),decision_changed:changed,sheet_sync_status:"pending",notification_status:before.originating_chat_id?"pending":"not_required"}).eq("reference",reference).eq("status","Awaiting allocation").select().maybeSingle();
  if(error) throw new Error(error.message); if(!data){const latest=await client.from("expenses").select("*").eq("reference",reference).single();return{record:latest.data,duplicate:true};}
  try{await syncExpense(data);}catch(e){await markSyncFailure("expenses",reference,e);}
  if(data.originating_chat_id){const text=`Expense ${reference}${changed?" — allocation changed":""}. ${money(data.amount_cents)}: ${data.description}. Proposed: ${data.proposed_allocation}. Approved: ${data.final_allocation}.`;try{await telegram(data.originating_chat_id,text);await recordNotification("expense",data,"sent");}catch(e){await recordNotification("expense",data,"failed",e);}}
  return{record:data,duplicate:false};
}

export async function retry(slug:string,kind:"sale"|"expense",reference:string,target:"sheet"|"telegram"){
  const employee=await actor(slug); if(employee.role!=="manager") throw new Error("Only Svetlana may retry integrations.");
  const table=kind==="sale"?"sales":"expenses"; const {data,error}=await db().from(table).select("*").eq("reference",reference).single(); if(error||!data) throw new Error("Transaction not found.");
  if(target==="sheet"){if(kind==="sale") await syncSale(data); else await syncExpense(data); return data;}
  if(!data.originating_chat_id) throw new Error("No Telegram recipient linked.");
  const text=kind==="sale"?`Sale ${reference} decision: Approved, ${money(data.amount_cents)}; total commission ${money(data.commission_pool_cents)}.`:`Expense ${reference} decision: ${money(data.amount_cents)}, final allocation ${data.final_allocation}.`;
  await telegram(data.originating_chat_id,text); await recordNotification(kind,data,"sent"); return data;
}
