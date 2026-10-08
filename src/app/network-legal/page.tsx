import { Eyebrow } from "@/components/Eyebrow";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

export const metadata = { title: "Network & legal · The Capital Room" };

// Render at request time so the Supabase query never runs during the build
// (avoids build-time failures when env/DB isn't reachable from the builder).
export const dynamic = "force-dynamic";

type LegalService = { id: string; title: string | null; description: string | null };

// Curated network roster, shown with permission. Kept in-code (not the DB) so
// the list is version-controlled and deploys with the site.
const NETWORK_PARTNERS: { name: string; category: string }[] = [
  { name: "Arali Ventures", category: "Venture capital" },
  { name: "Indo-Japan Business Council (IJBC)", category: "Business council" },
  { name: "J.P. Morgan", category: "Institutional" },
  { name: "BlackRock", category: "Institutional" },
  { name: "F3 Venture Capital Company Limited", category: "Venture capital" },
  { name: "3one4 Capital", category: "Venture capital" },
  { name: "Brick Ventures", category: "Venture capital" },
  { name: "Expert Dojo", category: "Accelerator" },
  { name: "Corporate Capital Ventures Pvt. Ltd.", category: "Venture capital" },
  { name: "LvlUp Ventures", category: "Venture capital" },
  { name: "Blue Ventures", category: "Venture capital" },
];

export default async function NetworkLegalPage() {
  const supabase = createClient();
  const adminDb = createAdminClient();

  const { data: services } = await supabase
    .from("legal_services")
    .select("id, title, description")
    .order("sort_order", { ascending: true });

  const legalServices = (services ?? []) as LegalService[];

  // Fetch recent submissions for the preview section
  const { data: submissions } = await adminDb
    .from("submissions")
    .select(`
      id,
      startups!inner (
        company_name, deck_url
      )
    `)
    .order("submitted_at", { ascending: false })
    .limit(6);

  const decks = [];
  if (submissions) {
    for (const s of submissions) {
      const startup = s.startups as any;
      
      // Hide test submissions from the public network page
      if (startup.company_name.toLowerCase() === "testing") {
        continue;
      }
      
      if (startup.deck_url) {
        const { data: signed } = await adminDb.storage
          .from(serverEnv.deckBucket)
          .createSignedUrl(startup.deck_url, 60 * 60); // 1 hour expiry
        if (signed?.signedUrl) {
          decks.push({
            id: s.id,
            companyName: startup.company_name,
            deckUrl: signed.signedUrl,
          });
        }
      }
    }
  }

  return (
    <>
      {/* Hero — dark navy */}
      <section className="bg-navy-gradient text-white">
        <div className="container-tr py-24 text-center">
          <Eyebrow className="text-mint/80">Network &amp; legal</Eyebrow>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-5xl leading-[1.08]">
            Capital conversations, backed by practical counsel.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-white/70">
            A discreet introduction layer for founders who need both access and
            strong legal footing as the opportunity becomes real.
          </p>
        </div>
      </section>

      {/* Services — light paper */}
      <section className="bg-paper">
        <div className="container-tr py-24">
          <Eyebrow>Legal services</Eyebrow>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {legalServices.map((s) => (
              <div key={s.id} className="card-dashed bg-mint/25">
                <h3 className="font-display text-2xl text-navy">{s.title}</h3>
                <p className="mt-3 text-sm text-navy/65">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Submissions — Preview */}
      {decks.length > 0 && (
        <section className="bg-paper border-t border-navy/10">
          <div className="container-tr py-24">
            <Eyebrow>Deal flow</Eyebrow>
            <h2 className="mt-4 font-display text-4xl text-navy">
              Recent submissions
            </h2>
            <p className="mt-4 max-w-xl text-navy/70">
              A glimpse at the latest companies in our queue. Full access is restricted to approved network partners.
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck) => (
                <div key={deck.id} className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm">
                  {/* PDF iframe preview with interaction blocked */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy/5">
                    <iframe 
                      src={`${deck.deckUrl}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                      className="absolute inset-0 h-full w-full pointer-events-none"
                      tabIndex={-1}
                    />
                    {/* Overlay to enforce locked state & prevent clicking/scrolling */}
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-navy/20 backdrop-blur-[2px]">
                      <div className="rounded-full bg-navy/90 px-4 py-2 text-sm font-medium text-white shadow-lg flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Rest locked
                      </div>
                    </div>
                  </div>
                  <div className="p-5 border-t border-navy/5">
                    <h3 className="font-display text-xl text-navy">{deck.companyName}</h3>
                    <p className="mt-1 text-sm text-navy/60">Pitch deck submitted</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Partners — mint */}
      <section className="bg-mint">
        <div className="container-tr py-24 text-center">
          <Eyebrow>Connected capital</Eyebrow>
          <h2 className="mt-4 font-display text-4xl text-navy">
            An active network of investors and partners.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-navy/70">
            We maintain selective, current relationships across venture capital,
            institutional capital, and accelerators. A selection of the names in
            our network, shared with permission:
          </p>

          <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-2 md:grid-cols-3">
            {NETWORK_PARTNERS.map((p) => (
              <div key={p.name} className="rounded-2xl bg-white/70 p-6 text-left">
                <h3 className="font-display text-xl text-navy">{p.name}</h3>
                <p className="eyebrow mt-3 text-navy/45">{p.category}</p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-xl text-sm text-navy/55">
            Introductions are made selectively and only where there is a genuine
            fit. Inclusion here reflects a network relationship, not an
            endorsement of any individual submission.
          </p>
        </div>
      </section>
    </>
  );
}
