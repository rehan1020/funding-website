import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments/provider";
import { serverEnv, publicEnv } from "@/lib/env";
import { audit, clientIp } from "@/lib/audit";

const bodySchema = z.object({ submissionId: z.string().uuid() });

// Creates a gateway checkout session server-side. Public intake (no founder
// login); the gateway secret key is never exposed to the client, which only
// receives a redirect URL.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission reference." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify the submission exists and is priority, and pull founder contact
  // details Cashfree needs (customer_phone is required).
  const { data: submission } = await admin
    .from("submissions")
    .select(
      "id, review_type, startups!inner(work_email, founders(name, email, phone))"
    )
    .eq("id", parsed.data.submissionId)
    .single();

  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (submission.review_type !== "priority") {
    return NextResponse.json({ error: "This submission is not priority." }, { status: 400 });
  }
  const startup = (submission as any).startups;
  const founder = startup?.founders;

  const provider = getPaymentProvider();
  const checkout = await provider.createCheckout({
    submissionId: submission.id,
    amount: serverEnv.priorityAmount,
    currency: serverEnv.priorityCurrency,
    customerEmail: founder?.email ?? startup?.work_email ?? "",
    customerName: founder?.name ?? undefined,
    customerPhone: founder?.phone ?? undefined,
    // Cashfree sends the founder back here after checkout; the page re-verifies
    // server-side via Get Order before showing "confirmed".
    successUrl: `${publicEnv.siteUrl}/submitted?submission=${submission.id}`,
    cancelUrl: `${publicEnv.siteUrl}/pay/priority?submission=${submission.id}`,
    notifyUrl: `${publicEnv.siteUrl}/api/webhooks/payment`,
  });

  // Record a pending payment keyed on the provider ref (idempotency anchor).
  const { error: payErr } = await admin.from("payments").upsert(
    {
      submission_id: submission.id,
      provider: provider.name,
      provider_ref: checkout.providerRef,
      amount: serverEnv.priorityAmount,
      currency: serverEnv.priorityCurrency,
      status: "pending",
    },
    { onConflict: "provider_ref" }
  );
  if (payErr) {
    return NextResponse.json({ error: "Could not initialise payment." }, { status: 500 });
  }

  await audit(admin, {
    action: "checkout.session_created",
    targetTable: "payments",
    targetId: submission.id,
    ip: clientIp(request.headers),
  });

  // Cashfree: hand the session to the browser SDK. Legacy/hosted providers:
  // a plain redirect URL.
  return NextResponse.json({
    paymentSessionId: checkout.paymentSessionId ?? null,
    mode: checkout.mode ?? null,
    redirectUrl: checkout.redirectUrl ?? null,
  });
}
