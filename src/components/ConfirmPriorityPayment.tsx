"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "succeeded" | "pending" | "failed" | "none" | "unknown";

// Runs on the /submitted?submission=<id> return from Cashfree. Asks our server
// to reconcile the payment via the Get Order API (the browser redirect alone is
// never trusted) and shows the confirmed result.
export function ConfirmPriorityPayment({ submissionId }: { submissionId: string }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ submissionId }),
        });
        const data = await res.json();
        if (active) setStatus((data?.status as Status) ?? "unknown");
      } catch {
        if (active) setStatus("unknown");
      }
    })();
    return () => {
      active = false;
    };
  }, [submissionId]);

  if (status === "succeeded") {
    return (
      <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Priority payment confirmed. Your submission has been moved to the front
        of the queue — we&apos;ll follow up on WhatsApp shortly.
      </p>
    );
  }
  if (status === "failed") {
    return (
      <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        We couldn&apos;t confirm a completed payment. If you were charged, don&apos;t
        worry — reach out on WhatsApp and we&apos;ll sort it out.
      </p>
    );
  }
  if (status === "checking" || status === "pending") {
    return (
      <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Confirming your payment… this can take a moment. You&apos;ll get a
        WhatsApp update once it&apos;s verified.
      </p>
    );
  }
  return null; // "none"/"unknown": standard submission copy already shown
}
