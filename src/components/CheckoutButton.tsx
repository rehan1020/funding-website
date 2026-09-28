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
      // Redirect to the gateway-hosted checkout page.
      window.location.href = data.redirectUrl;
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
