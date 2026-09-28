import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminUser {
  id: string;
  email: string | null;
}

// Returns the signed-in user IFF they are registered in the admins table,
// otherwise null. Session identity comes from the auth cookie; the admin
// check is done with the service-role client (admins table is not client
// readable beyond the self row).
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;
  return { id: user.id, email: user.email ?? null };
}
