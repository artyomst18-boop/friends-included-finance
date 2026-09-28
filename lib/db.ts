import { createClient } from "@supabase/supabase-js";

export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function actor(slug: string) {
  const { data, error } = await db().from("employees").select("*").eq("slug", slug).single();
  if (error || !data) throw new Error("Unknown demonstration role.");
  return data;
}

export function requireRole(employee: { role: string }, role: string) {
  if (employee.role !== role) throw new Error(`Permission denied: this action requires the ${role} role.`);
}
