import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submissionSchema } from "@/lib/validation";
import { audit, clientIp } from "@/lib/audit";

// All writes here run through the service-role client. The client never writes
// to startups/submissions directly (RLS grants no such policy).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Founder identity comes from the authenticated magic-link session, not the
  // request body — we never trust a client-supplied founder id.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please sign in with your work email to submit." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  // Ensure a founders row exists for this authenticated user.
  const { error: founderErr } = await admin
    .from("founders")
    .upsert({ id: user.id, email: user.email }, { onConflict: "id" });
  if (founderErr) {
    return NextResponse.json({ error: "Could not record founder." }, { status: 500 });
  }

  // Create the startup owned by this founder.
  const { data: startup, error: startupErr } = await admin
    .from("startups")
    .insert({
      founder_id: user.id,
      company_name: input.companyName,
      work_email: input.workEmail,
      pitch_summary: input.pitchSummary,
      deck_url: input.deckPath ?? null,
    })
    .select("id")
    .single();
  if (startupErr || !startup) {
    return NextResponse.json({ error: "Could not save your startup." }, { status: 500 });
  }

  // Create the submission. Priority stays 'queued' until payment succeeds;
  // status is only advanced to 'paid_priority' by the verified webhook.
  const { data: submission, error: subErr } = await admin
    .from("submissions")
    .insert({
      startup_id: startup.id,
      review_type: input.reviewType,
      status: "queued",
    })
    .select("id")
    .single();
  if (subErr || !submission) {
    return NextResponse.json({ error: "Could not create submission." }, { status: 500 });
  }

  // Queue position is computed server-side, never set by the client.
  await admin.rpc("recompute_queue_positions");

  await audit(admin, {
    actor: user.id,
    action: "submission.created",
    targetTable: "submissions",
    targetId: submission.id,
    ip: clientIp(request.headers),
  });

  return NextResponse.json({ submissionId: submission.id }, { status: 201 });
}
