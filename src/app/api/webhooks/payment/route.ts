import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments/provider";
import { applyPaymentEvent } from "@/lib/payments/reconcile";

// Payment gateway webhook. Runs on the Node runtime so we can read the raw
// body for signature verification. NO payment state is trusted from the client
// redirect — only this verified webhook (or the server-side Get Order status
// check on return) advances payment/submission status.
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
  const result = await applyPaymentEvent(admin, event);

  // Acknowledge either way so the gateway stops retrying; an unmatched ref just
  // means we have no record for it.
  return NextResponse.json({ received: true, ...result });
}
