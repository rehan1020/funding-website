import { Eyebrow } from "@/components/Eyebrow";
import { CheckoutButton } from "@/components/CheckoutButton";

export const metadata = { title: "Priority review · The Capital Room" };

export default function PriorityPage({
  searchParams,
}: {
  searchParams: { submission?: string };
}) {
  const submissionId = searchParams.submission ?? null;

  return (
    <section className="bg-navy-gradient min-h-[calc(100vh-8rem)]">
      <div className="container-tr py-24 text-center text-white">
        <Eyebrow className="text-mint/80">Priority review</Eyebrow>
        <h1 className="mx-auto mt-5 max-w-2xl font-display text-5xl leading-[1.05]">
          When the moment cannot wait.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-white/70">
          Priority review moves your complete submission to the front of our
          internal review queue. Your deck and details are checked first, before
          an appropriate next step is confirmed.
        </p>

        <div className="mx-auto mt-12 max-w-xl rounded-3xl bg-white p-8 text-left text-navy md:p-10">
          <Eyebrow className="text-navy/50">Accelerated review</Eyebrow>
          <p className="mt-4 text-navy/75">
            Priority review is a paid, accelerated service. You&apos;ll be taken
            to our secure payment page to complete it. Once your payment is
            confirmed, our team moves your submission to the front of the queue
            and follows up on WhatsApp.
          </p>
          <div className="mt-7">
            <CheckoutButton submissionId={submissionId} />
          </div>
        </div>
      </div>
    </section>
  );
}
