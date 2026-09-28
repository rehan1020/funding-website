import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

const bodySchema = z.object({ path: z.string().min(1).max(1024) });

// Returns a short-lived signed DOWNLOAD url for a deck the caller owns. Decks
// are never public; the founder's uid must be the leading path segment.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  // Ownership check: path is "<uid>/<file>.pdf".
  if (parsed.data.path.split("/")[0] !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(serverEnv.deckBucket)
    .createSignedUrl(parsed.data.path, 60); // 60-second link
  if (error || !data) {
    return NextResponse.json({ error: "Could not create link." }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
