import { Eyebrow } from "@/components/Eyebrow";
import { SubmitForm } from "@/components/SubmitForm";

export const metadata = { title: "Submit a pitch · The Capital Room" };

export default function SubmitPage() {
  return (
    <section className="bg-mint-gradient min-h-[calc(100vh-8rem)]">
      <div className="container-tr py-20">
        <div className="text-center">
          <Eyebrow>Founder intake</Eyebrow>
          <h1 className="mx-auto mt-5 max-w-xl font-display text-5xl leading-[1.05] text-navy">
            Put your best case forward.
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-navy/70">
            We ask for the information our investor conversations actually need.
            Complete the essentials, then choose your review path.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl rounded-3xl bg-white p-8 shadow-sm md:p-10">
          <SubmitForm />
        </div>
      </div>
    </section>
  );
}
