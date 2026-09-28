import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, clientIp } from "@/lib/audit";

const bodySchema = z.object({
  submissionId: z.string().uuid(),
  status: z.enum(["queued", "paid_priority", "under_review", "contacted", "rejected"]),
});

// Admin-only: update a submission's status. Guarded by admins-table membership.
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db
    .from("submissions")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.submissionId);
  if (error) {
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  // Status changes can affect queue ordering (e.g. rejection leaves the queue).
  await db.rpc("recompute_queue_positions");

  await audit(db, {
    actor: admin.id,
    action: `submission.status.${parsed.data.status}`,
    targetTable: "submissions",
    targetId: parsed.data.submissionId,
    ip: clientIp(request.headers),
  });

  return NextResponse.json({ ok: true });
}
