import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Append an audit row using the service-role client. Failures are swallowed so
// auditing never blocks the primary operation, but are logged server-side.
export async function audit(
  admin: SupabaseClient,
  entry: {
    actor?: string | null;
    action: string;
    targetTable: string;
    targetId?: string | null;
    ip?: string | null;
  }
) {
  const { error } = await admin.from("audit_log").insert({
    actor: entry.actor ?? null,
    action: entry.action,
    target_table: entry.targetTable,
    target_id: entry.targetId ?? null,
    ip: entry.ip ?? null,
  });
  if (error) console.error("audit_log insert failed:", error.message);
}

export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : null;
}
