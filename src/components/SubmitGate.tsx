"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { publicEnv } from "@/lib/env";
import { SubmitForm } from "@/components/SubmitForm";

type Phase = "loading" | "signed-out" | "sent" | "signed-in";

export function SubmitGate() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setPhase(data.user ? "signed-in" : "signed-out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setPhase(session?.user ? "signed-in" : "signed-out");
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function sendLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/submit` },
    });
    setSending(false);
    if (error) setError(error.message);
    else setPhase("sent");
  }

  if (phase === "signed-in") return <SubmitForm />;

  if (phase === "sent") {
    return (
      <div className="text-center">
        <h3 className="font-display text-2xl text-navy">Check your inbox.</h3>
        <p className="mt-3 text-sm text-navy/65">
          We sent a secure sign-in link to <strong>{email}</strong>. Open it on
          this device to continue your submission.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={sendLink} className="space-y-5">
      <div>
        <label htmlFor="signin-email" className="field-label">
          Work email
        </label>
        <input
          id="signin-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input"
          placeholder="founder@company.com"
        />
        <p className="mt-2 text-xs text-navy/50">
          We verify founders with a one-time email link before a submission
          enters the room.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={sending} className="btn-pill w-full">
        {sending ? "Sending link…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
