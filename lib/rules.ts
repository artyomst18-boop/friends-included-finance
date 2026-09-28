import type { Allocation, Expense, Project, Sale, Split } from "./types";

export function cents(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Amount must be greater than zero.");
  return Math.round((n + Number.EPSILON) * 100);
}

export function validateReference(value: unknown, kind: "sale" | "expense") {
  const ref = String(value ?? "").trim().toUpperCase();
  const pattern = kind === "sale" ? /^S[0-9A-Z-]+$/ : /^E[0-9A-Z-]+$/;
  if (!pattern.test(ref)) throw new Error(`Reference must begin with ${kind === "sale" ? "S" : "E"}.`);
  return ref;
}

export function validateSplit(split: Split): Split {
  const values = [split.richard, split.anastasia, split.jeanClaude];
  if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) throw new Error("Each commission share must be from 0% to 100%.");
  if (values.reduce((a, b) => a + b, 0) !== 100) throw new Error("Commission shares must total exactly 100%.");
  return split;
}

export function commissions(amountCents: number, split: Split) {
  validateSplit(split);
  const pool = Math.round(amountCents * 0.1);
  const parts = [split.richard, split.anastasia, split.jeanClaude].map((p) => Math.round(pool * p / 100));
  const difference = pool - parts.reduce((a, b) => a + b, 0);
  const largest = Math.max(split.richard, split.anastasia, split.jeanClaude);
  const winner = [split.richard, split.anastasia, split.jeanClaude].findIndex((p) => p === largest);
  parts[winner] += difference;
  return { pool, richard: parts[0], anastasia: parts[1], jeanClaude: parts[2] };
}

export function money(c: number) { return `€${(c / 100).toFixed(2)}`; }

export function calculateDashboard(sales: Sale[], expenses: Expense[]) {
  const approved = sales.filter((s) => s.status === "Approved");
  const income = (project?: Project) => approved.filter((s) => !project || s.project === project).reduce((n, s) => n + s.amount_cents, 0);
  const commission = (project?: Project) => approved.filter((s) => !project || s.project === project).reduce((n, s) => n + s.commission_pool_cents, 0);
  const allocated = (allocation: Allocation) => expenses.filter((e) => e.final_allocation === allocation).reduce((n, e) => n + e.amount_cents, 0);
  const allExpenses = expenses.reduce((n, e) => n + e.amount_cents, 0);
  const awaiting = expenses.filter((e) => e.status === "Awaiting allocation").reduce((n, e) => n + e.amount_cents, 0);
  const salesperson = (key: "richard" | "anastasia" | "jean_claude") => approved.reduce((n, s) => n + (key === "richard" ? s.richard_commission_cents : key === "anastasia" ? s.anastasia_commission_cents : s.jean_claude_commission_cents), 0);
  return {
    projects: {
      A: { income: income("A"), commission: commission("A"), expenses: allocated("A"), result: income("A") - commission("A") - allocated("A") },
      B: { income: income("B"), commission: commission("B"), expenses: allocated("B"), result: income("B") - commission("B") - allocated("B") }
    },
    company: { income: income(), commission: commission(), expenses: allExpenses, overhead: allocated("Company overhead"), awaiting, result: income() - commission() - allExpenses },
    earned: { richard: salesperson("richard"), anastasia: salesperson("anastasia"), jeanClaude: salesperson("jean_claude") }
  };
}
