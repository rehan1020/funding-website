import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submissionSchema } from "@/lib/validation";
import { audit, clientIp } from "@/lib/audit";

// Public, unauthenticated intake. Founders do NOT log in. All writes run
// through the service-role client; the client never writes these tables
// directly (RLS grants no client policy).
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
  const admin = createAdminClient();

  // Upsert a founder record keyed by email (no auth account). Also refresh the
  // contact name / phone in case they changed on a repeat submission.
  const { data: founder, error: founderErr } = await admin
    .from("founders")
    .upsert(
      { email: input.email, name: input.contactName, phone: input.phone },
      { onConflict: "email" }
    )
    .select("id")
    .single();
  if (founderErr || !founder) {
    return NextResponse.json({ error: "Could not record contact." }, { status: 500 });
  }

  const { data: startup, error: startupErr } = await admin
    .from("startups")
    .insert({
      founder_id: founder.id,
      company_name: input.companyName,
      work_email: input.email,
      pitch_summary: input.pitchSummary,
      website: input.website || null,
      socials: input.socials || null,
      deck_url: input.deckPath ?? null,
    })
    .select("id")
    .single();
  if (startupErr || !startup) {
    return NextResponse.json({ error: "Could not save your startup." }, { status: 500 });
  }

  // Priority stays 'queued' until payment succeeds (advanced only by the
  // verified webhook). Queue position is computed server-side.
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

  await admin.rpc("recompute_queue_positions");

  await audit(admin, {
    action: "submission.created",
    targetTable: "submissions",
    targetId: submission.id,
    ip: clientIp(request.headers),
  });

  return NextResponse.json({ submissionId: submission.id }, { status: 201 });
}
