import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { AdminSubmissions, type AdminRow } from "@/components/AdminSubmissions";

export const metadata = { title: "Review queue · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  const db = createAdminClient();
  const { data } = await db
    .from("submissions")
    .select(
      `id, status, review_type, queue_position, submitted_at,
       startups!inner (
         company_name, work_email, pitch_summary, deck_url, website, socials,
         founders!inner ( name, email, phone )
       )`
    )
    .order("submitted_at", { ascending: true });

  const rows: AdminRow[] = [];
  for (const s of (data ?? []) as any[]) {
    const startup = s.startups;
    const founder = startup?.founders;

    // Short-lived signed URL so admins can open the deck in-browser.
    let deckUrl: string | null = null;
    if (startup?.deck_url) {
      const { data: signed } = await db.storage
        .from(serverEnv.deckBucket)
        .createSignedUrl(startup.deck_url, 60 * 30); // 30 min
      deckUrl = signed?.signedUrl ?? null;
    }

    rows.push({
      id: s.id,
      status: s.status,
      reviewType: s.review_type,
      queuePosition: s.queue_position,
      submittedAt: s.submitted_at,
      companyName: startup?.company_name ?? "",
      pitchSummary: startup?.pitch_summary ?? "",
      website: startup?.website ?? null,
      socials: startup?.socials ?? null,
      contactName: founder?.name ?? null,
      email: founder?.email ?? startup?.work_email ?? null,
      phone: founder?.phone ?? null,
      deckUrl,
    });
  }

  return (
    <section className="min-h-[calc(100vh-8rem)] bg-paper">
      <div className="container-tr py-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow text-navy/50">Admin</p>
            <h1 className="mt-2 font-display text-4xl text-navy">Review queue</h1>
          </div>
          <span className="text-sm text-navy/50">{admin.email}</span>
        </div>
        <AdminSubmissions initialRows={rows} />
      </div>
    </section>
  );
}
