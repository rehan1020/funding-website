import { Eyebrow } from "@/components/Eyebrow";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Network & legal · The Capital Room" };

// Render at request time so the Supabase query never runs during the build
// (avoids build-time failures when env/DB isn't reachable from the builder).
export const dynamic = "force-dynamic";

type LegalService = { id: string; title: string | null; description: string | null };
type VcPartner = { id: string; name: string | null; firm: string | null; focus_areas: string[] | null };

export default async function NetworkLegalPage() {
  const supabase = createClient();

  // Public reads only — RLS restricts vc_partners to is_public = true.
  const [{ data: services }, { data: partners }] = await Promise.all([
    supabase
      .from("legal_services")
      .select("id, title, description")
      .order("sort_order", { ascending: true }),
    supabase.from("vc_partners").select("id, name, firm, focus_areas"),
  ]);

  const legalServices = (services ?? []) as LegalService[];
  const vcPartners = (partners ?? []) as VcPartner[];

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
            Partner names are shared with permission.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-navy/70">
            We keep investor relationships selective and current. Confirmed
            partner names, mandates, and relevant introduction paths can be added
            here when approved.
          </p>

          {vcPartners.length > 0 && (
            <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-3">
              {vcPartners.map((p) => (
                <div key={p.id} className="rounded-2xl bg-white/70 p-6 text-left">
                  <h3 className="font-display text-xl text-navy">{p.name}</h3>
                  {p.firm && <p className="mt-1 text-sm text-navy/60">{p.firm}</p>}
                  {p.focus_areas && p.focus_areas.length > 0 && (
                    <p className="eyebrow mt-3 text-navy/45">
                      {p.focus_areas.join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
