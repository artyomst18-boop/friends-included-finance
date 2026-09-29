import { google } from "googleapis";
import { db } from "./db";
import { money } from "./rules";
import type { Expense, Sale } from "./types";

function sheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY
    ?.trim()
    .replace(/^(["'])|(["'])$/g, "")
    .replace(/\\n/g, "\n");
  if (!email || !key || !process.env.GOOGLE_SHEET_ID) throw new Error("Google Sheets is not configured.");
  const auth = new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  return google.sheets({ version: "v4", auth });
}

const saleHeaders = ["Reference","Submitted at","Salesperson","Customer","Project","Description","Amount","Proposed Richard %","Proposed Anastasia %","Proposed Jean-Claude %","Approved Richard %","Approved Anastasia %","Approved Jean-Claude %","Richard commission","Anastasia commission","Jean-Claude commission","Total commission","Status","Sheet sync","Notification"];
const expenseHeaders = ["Reference","Submitted at","Reporter","Description","Category","Amount","Proposed allocation","Final allocation","Status","Sheet sync","Notification"];

async function upsertRow(tab: "Sales" | "Expenses", headers: string[], reference: string, row: (string | number)[]) {
  const api = sheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  const existing = await api.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A:Z` });
  const rows = existing.data.values ?? [];
  if (!rows.length) await api.spreadsheets.values.update({ spreadsheetId, range: `${tab}!A1`, valueInputOption: "RAW", requestBody: { values: [headers] } });
  const index = rows.findIndex((r, i) => i > 0 && r[0] === reference);
  if (index >= 0) await api.spreadsheets.values.update({ spreadsheetId, range: `${tab}!A${index + 1}`, valueInputOption: "RAW", requestBody: { values: [row] } });
  else await api.spreadsheets.values.append({ spreadsheetId, range: `${tab}!A:Z`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: [row] } });
}

export async function syncSale(s: Sale) {
  const row = [s.reference,s.submitted_at,s.salesperson,s.customer,s.project,s.description,money(s.amount_cents),s.proposed_richard_pct,s.proposed_anastasia_pct,s.proposed_jean_claude_pct,s.approved_richard_pct ?? "",s.approved_anastasia_pct ?? "",s.approved_jean_claude_pct ?? "",money(s.richard_commission_cents),money(s.anastasia_commission_cents),money(s.jean_claude_commission_cents),money(s.commission_pool_cents),s.status,"synced",s.notification_status];
  await upsertRow("Sales", saleHeaders, s.reference, row);
  await db().from("sales").update({ sheet_sync_status: "synced", sheet_sync_error: null }).eq("reference", s.reference);
}

export async function syncExpense(e: Expense) {
  const row = [e.reference,e.submitted_at,e.reporter,e.description,e.category,money(e.amount_cents),e.proposed_allocation,e.final_allocation ?? "",e.status,"synced",e.notification_status];
  await upsertRow("Expenses", expenseHeaders, e.reference, row);
  await db().from("expenses").update({ sheet_sync_status: "synced", sheet_sync_error: null }).eq("reference", e.reference);
}

export async function markSyncFailure(table: "sales" | "expenses", reference: string, error: unknown) {
  await db().from(table).update({ sheet_sync_status: "failed", sheet_sync_error: String(error).slice(0, 500) }).eq("reference", reference);
}

export async function telegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram is not configured.");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) });
  if (!response.ok) throw new Error(`Telegram send failed (${response.status}).`);
}
