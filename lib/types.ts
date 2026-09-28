export type EmployeeSlug = "svetlana" | "richard" | "anastasia" | "jean-claude" | "kevin";
export type Project = "A" | "B";
export type Allocation = Project | "Company overhead";
export type Split = { richard: number; anastasia: number; jeanClaude: number };

export type Sale = {
  reference: string; submitted_at: string; salesperson: EmployeeSlug; originating_chat_id: string | null;
  customer: string; project: Project; description: string; amount_cents: number;
  proposed_richard_pct: number; proposed_anastasia_pct: number; proposed_jean_claude_pct: number;
  approved_richard_pct: number | null; approved_anastasia_pct: number | null; approved_jean_claude_pct: number | null;
  richard_commission_cents: number; anastasia_commission_cents: number; jean_claude_commission_cents: number;
  commission_pool_cents: number; status: "Pending approval" | "Approved";
  sheet_sync_status: "pending" | "synced" | "failed"; notification_status: "not_required" | "pending" | "sent" | "failed";
};

export type Expense = {
  reference: string; submitted_at: string; reporter: EmployeeSlug; originating_chat_id: string | null;
  description: string; category: "Materials" | "Travel" | "Other"; amount_cents: number;
  proposed_allocation: Allocation; final_allocation: Allocation | null;
  status: "Awaiting allocation" | "Allocated"; sheet_sync_status: "pending" | "synced" | "failed";
  notification_status: "not_required" | "pending" | "sent" | "failed";
};
