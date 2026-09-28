import { Eyebrow } from "@/components/Eyebrow";
import { ConfirmPriorityPayment } from "@/components/ConfirmPriorityPayment";

export const metadata = { title: "Submission received · The Capital Room" };

export default function SubmittedPage({
  searchParams,
}: {
  searchParams: { submission?: string };
}) {
  const submissionId = searchParams.submission ?? null;

  return (
    <section className="bg-mint-gradient min-h-[calc(100vh-8rem)]">
      <div className="container-tr py-28 text-center">
        <Eyebrow>Submission received</Eyebrow>
        <h1 className="mx-auto mt-6 max-w-2xl font-display text-5xl leading-[1.05] text-navy">
          Your place in the room is confirmed.
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-navy/70">
          We have received your materials. Our team reviews every submission and
          will reach out on WhatsApp when your review moves forward.
        </p>

        <div className="mx-auto mt-12 max-w-md rounded-3xl bg-white p-8 text-left shadow-sm">
          <Eyebrow className="text-navy/50">Current status</Eyebrow>
          <h2 className="mt-3 font-display text-2xl text-navy">
            Submission under review
          </h2>
          <p className="mt-3 text-sm text-navy/65">
            A member of our team will contact you on WhatsApp if there is a
            relevant next conversation.
          </p>
          {submissionId && <ConfirmPriorityPayment submissionId={submissionId} />}
        </div>
      </div>
    </section>
  );
}
