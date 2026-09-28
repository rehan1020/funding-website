import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments/provider";
import { applyPaymentEvent } from "@/lib/payments/reconcile";

// Server-side reconciliation for the browser return_url. The redirect itself is
// never trusted — we look up the payment's provider_ref and ask the gateway for
// the authoritative status, then apply it idempotently (same path as webhooks).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ submissionId: z.string().uuid() });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ status: "unknown" }, { status: 400 });
  }

  const provider = getPaymentProvider();
  if (!provider.fetchStatus) {
    // Provider has no status API (e.g. hosted_form) — nothing to reconcile.
    return NextResponse.json({ status: "unknown" });
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("provider_ref, status")
    .eq("submission_id", parsed.data.submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment?.provider_ref) {
    return NextResponse.json({ status: "none" });
  }
  if (payment.status === "succeeded") {
    return NextResponse.json({ status: "succeeded" });
  }

  const event = await provider.fetchStatus(payment.provider_ref);
  if (!event) {
    return NextResponse.json({ status: payment.status ?? "pending" });
  }

  await applyPaymentEvent(admin, event);
  return NextResponse.json({ status: event.status });
}
