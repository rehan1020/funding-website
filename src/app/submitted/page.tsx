import { Eyebrow } from "@/components/Eyebrow";

export const metadata = { title: "Submission received · The Capital Room" };

export default function SubmittedPage() {
  return (
    <section className="bg-mint-gradient min-h-[calc(100vh-8rem)]">
      <div className="container-tr py-28 text-center">
        <Eyebrow>Submission received</Eyebrow>
        <h1 className="mx-auto mt-6 max-w-2xl font-display text-5xl leading-[1.05] text-navy">
          Your place in the room is confirmed.
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-navy/70">
          We have received your materials. You will receive a private email link
          when your review moves forward, so there is no public queue information
          to expose.
        </p>

        <div className="mx-auto mt-12 max-w-md rounded-3xl bg-white p-8 text-left shadow-sm">
          <Eyebrow className="text-navy/50">Current status</Eyebrow>
          <h2 className="mt-3 font-display text-2xl text-navy">
            Submission under review
          </h2>
          <p className="mt-3 text-sm text-navy/65">
            A member of our team will contact you by email if there is a relevant
            next conversation.
          </p>
        </div>
      </div>
    </section>
  );
}
