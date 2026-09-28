import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VerifiedWebhookEvent } from "@/lib/payments/provider";
import { audit } from "@/lib/audit";

// Applies a verified payment event to the DB, idempotently. Shared by the
// webhook handler and the return_url status check so both converge to the same
// state. Matches on provider_ref; only a "succeeded" event promotes the
// submission to paid_priority.
export async function applyPaymentEvent(
  admin: SupabaseClient,
  event: VerifiedWebhookEvent
): Promise<{ matched: boolean; status?: string; idempotent?: boolean }> {
  if (!event.providerRef) return { matched: false };

  const { data: payment } = await admin
    .from("payments")
    .select("id, submission_id, status")
    .eq("provider_ref", event.providerRef)
    .single();

  if (!payment) return { matched: false };
  if (payment.status === "succeeded") {
    return { matched: true, status: "succeeded", idempotent: true };
  }

  await admin.from("payments").update({ status: event.status }).eq("id", payment.id);

  if (event.status === "succeeded") {
    await admin
      .from("submissions")
      .update({ status: "paid_priority" })
      .eq("id", payment.submission_id);
    await admin.rpc("recompute_queue_positions");
  }

  await audit(admin, {
    action: `payment.${event.status}`,
    targetTable: "payments",
    targetId: payment.id,
  });

  return { matched: true, status: event.status };
}
