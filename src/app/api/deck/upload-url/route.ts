import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.literal("application/pdf"),
  size: z.number().int().positive().max(20 * 1024 * 1024), // 20 MB cap
});

// Returns a short-lived signed UPLOAD url so the founder can PUT their deck
// straight into the private bucket. Path is namespaced by founder uid, which
// the Storage RLS read policy keys on. The server owns the path — the client
// cannot choose an arbitrary location.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const path = `${user.id}/${randomUUID()}.pdf`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(serverEnv.deckBucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: "Could not prepare upload." }, { status: 500 });
  }

  // token + path let the client complete the upload via uploadToSignedUrl.
  return NextResponse.json({ path: data.path, token: data.token });
}
