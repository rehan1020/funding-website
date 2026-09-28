import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.literal("application/pdf"),
  size: z.number().int().positive().max(20 * 1024 * 1024), // 20 MB cap
});

// Returns a short-lived signed UPLOAD url so the founder can PUT their deck
// straight into the private bucket. Public intake (no login), so the path is
// a server-chosen random key under decks/. Decks stay private; only admins
// view them (via server-generated signed URLs).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }

  const path = `decks/${randomUUID()}.pdf`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(serverEnv.deckBucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: "Could not prepare upload." }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
