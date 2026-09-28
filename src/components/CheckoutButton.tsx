"use client";

import { useState } from "react";

export function CheckoutButton({ submissionId }: { submissionId: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    if (!submissionId) {
      setError("Missing submission reference. Please submit your pitch again.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not start checkout.");

      if (data.paymentSessionId) {
        // Cashfree hosted checkout: hand the session to the browser SDK. It
        // navigates to the gateway page and returns to our return_url.
        const { load } = await import("@cashfreepayments/cashfree-js");
        const cashfree = await load({ mode: data.mode ?? "production" });
        cashfree.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: "_self",
        });
        return; // browser navigates away
      }

      if (data.redirectUrl) {
        // Legacy hosted-form provider: plain redirect.
        window.location.href = data.redirectUrl;
        return;
      }

      throw new Error("Checkout is not configured. Please contact us.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={startCheckout} disabled={loading} className="btn-pill">
        {loading ? "Preparing checkout…" : "Continue to secure checkout"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
