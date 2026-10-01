import { Eyebrow } from "@/components/Eyebrow";
import { createClient } from "@/lib/supabase/server";

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

  const { data: services } = await supabase
    .from("legal_services")
    .select("id, title, description")
    .order("sort_order", { ascending: true });

  const legalServices = (services ?? []) as LegalService[];

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
