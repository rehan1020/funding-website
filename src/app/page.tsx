import Link from "next/link";
import { Eyebrow } from "@/components/Eyebrow";

export default function HomePage() {
  return (
    <>
      {/* Hero — mint/teal gradient */}
      <section className="bg-mint-gradient">
        <div className="container-tr flex flex-col items-center py-28 text-center">
          <Eyebrow>Private access for investor-ready companies</Eyebrow>
          <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[1.05] text-navy md:text-6xl">
            Bring the right room into view.
          </h1>
          <p className="mt-6 max-w-xl text-navy/70">
            The Capital Room connects focused founders with a discreet network
            of capital, strategic operators, and trusted counsel.
          </p>
          <Link href="/submit" className="btn-pill mt-9">
            Submit your pitch
          </Link>
          <p className="eyebrow mt-9 text-navy/45">
            Initial review within 7 business days
          </p>
        </div>
      </section>

      {/* Process — light paper */}
      <section className="bg-paper">
        <div className="container-tr py-24 text-center">
          <Eyebrow>A deliberate path to the right conversation</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl text-navy">
            The queue is built for signal, not noise.
          </h2>

          <div className="mt-14 grid gap-5 text-left md:grid-cols-3">
            <div className="card-dashed">
              <p className="eyebrow text-navy/40">01</p>
              <h3 className="mt-3 font-display text-2xl">Submit the essentials</h3>
              <p className="mt-3 text-sm text-navy/65">
                Share the business, the raise, and the sharper version of your
                story.
              </p>
            </div>
            <div className="card-dashed">
              <p className="eyebrow text-navy/40">02</p>
              <h3 className="mt-3 font-display text-2xl">Enter the review queue</h3>
              <p className="mt-3 text-sm text-navy/65">
                We review every submission against our current mandate and
                partner appetite.
              </p>
            </div>
            <div className="card-navy">
              <p className="eyebrow text-white/50">03 / Priority</p>
              <h3 className="mt-3 font-display text-2xl">Choose a priority review</h3>
              <p className="mt-3 text-sm text-white/70">
                For time-sensitive opportunities, an accelerated review can be
                selected during submission.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
