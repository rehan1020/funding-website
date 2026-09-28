import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

// Service-role client. BYPASSES RLS — use ONLY inside server-only route
// handlers for privileged mutations (submissions, payments, audit_log,
// signed URLs). The "server-only" import guarantees a build error if this
// module is ever pulled into client bundles.
export function createAdminClient() {
  return createSupabaseClient(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
