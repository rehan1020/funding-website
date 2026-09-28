import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments/provider";
import { audit } from "@/lib/audit";

// Payment gateway webhook. Runs on the Node runtime so we can read the raw
// body for signature verification. NO payment state is trusted from the client
// redirect — only this verified webhook advances payment/submission status.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();

  const provider = getPaymentProvider();
  let event;
  try {
    // Throws on invalid/missing signature -> we never touch the DB.
    event = await provider.verifyWebhook(rawBody, request.headers);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotent: match on provider_ref. Repeated deliveries converge to the
  // same state rather than double-processing.
  const { data: payment } = await admin
    .from("payments")
    .select("id, submission_id, status")
    .eq("provider_ref", event.providerRef)
    .single();

  if (!payment) {
    // Unknown ref — acknowledge to stop retries, but record nothing.
    return NextResponse.json({ received: true, matched: false });
  }

  if (payment.status === "succeeded") {
    return NextResponse.json({ received: true, idempotent: true });
  }

  await admin
    .from("payments")
    .update({ status: event.status })
    .eq("id", payment.id);

  // Only a succeeded payment promotes the submission to priority.
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

  return NextResponse.json({ received: true });
}
