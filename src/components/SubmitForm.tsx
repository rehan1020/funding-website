"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "@/lib/cx";
import { createClient } from "@/lib/supabase/client";

type ReviewType = "standard" | "priority";

const MAX_DECK_BYTES = 20 * 1024 * 1024;

export function SubmitForm() {
  const router = useRouter();
  const [reviewType, setReviewType] = useState<ReviewType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deckName, setDeckName] = useState<string | null>(null);

  // Upload the deck (if any) to the private bucket via a server-signed URL and
  // return its storage path. The server owns the path; the client only uploads.
  async function uploadDeck(file: File): Promise<string> {
    const res = await fetch("/api/deck/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: "application/pdf",
        size: file.size,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Deck upload failed.");

    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from("pitch-decks")
      .uploadToSignedUrl(data.path, data.token, file);
    if (upErr) throw new Error(upErr.message);
    return data.path as string;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!reviewType) {
      setError("Select a review type to continue.");
      return;
    }

    const form = new FormData(e.currentTarget);
    const deck = form.get("deck");
    const deckFile = deck instanceof File && deck.size > 0 ? deck : null;
    if (deckFile) {
      if (deckFile.type !== "application/pdf") {
        setError("The deck must be a PDF.");
        return;
      }
      if (deckFile.size > MAX_DECK_BYTES) {
        setError("The deck exceeds the 20 MB maximum.");
        return;
      }
    }

    setSubmitting(true);

    let deckPath: string | null = null;
    try {
      if (deckFile) deckPath = await uploadDeck(deckFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deck upload failed.");
      setSubmitting(false);
      return;
    }

    const payload = {
      companyName: String(form.get("companyName") ?? ""),
      workEmail: String(form.get("workEmail") ?? ""),
      pitchSummary: String(form.get("pitchSummary") ?? ""),
      reviewType,
      deckPath,
    };

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");

      if (reviewType === "priority") {
        router.push(`/pay/priority?submission=${data.submissionId}`);
      } else {
        router.push("/submitted");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label htmlFor="companyName" className="field-label">
          Company name
        </label>
        <input
          id="companyName"
          name="companyName"
          required
          className="field-input"
          placeholder="Your company"
        />
      </div>

      <div>
        <label htmlFor="workEmail" className="field-label">
          Work email
        </label>
        <input
          id="workEmail"
          name="workEmail"
          type="email"
          required
          className="field-input"
          placeholder="founder@company.com"
        />
      </div>

      <div>
        <label htmlFor="pitchSummary" className="field-label">
          Pitch summary
        </label>
        <textarea
          id="pitchSummary"
          name="pitchSummary"
          required
          rows={4}
          className="field-input resize-y"
          placeholder="What are you building, for whom, and what are you raising?"
        />
      </div>

      <div>
        <span className="field-label">Pitch deck (optional)</span>
        <label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-navy/25 bg-white/40 px-4 py-6 text-center">
          <span className="font-display text-lg text-navy">
            {deckName ?? "Attach your deck"}
          </span>
          <span className="eyebrow mt-2 text-navy/40">
            PDF only · optional at this stage · 20 MB maximum
          </span>
          <input
            type="file"
            name="deck"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => setDeckName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ReviewOption
          selected={reviewType === "standard"}
          onSelect={() => setReviewType("standard")}
          title="Standard review"
          body="No fee. Join the queue and receive a response within 7 business days."
          tone="light"
        />
        <ReviewOption
          selected={reviewType === "priority"}
          onSelect={() => setReviewType("priority")}
          title="Priority review"
          body="Paid priority service for time-sensitive opportunities. Payment is selected in the next step."
          tone="dark"
        />
      </div>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      <div className="text-center">
        {reviewType ? (
          <button type="submit" disabled={submitting} className="btn-pill">
            {submitting ? "Submitting…" : "Continue"}
          </button>
        ) : (
          <p className="text-sm text-navy/50">Select a review type above to continue.</p>
        )}
      </div>
    </form>
  );
}

function ReviewOption({
  selected,
  onSelect,
  title,
  body,
  tone,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  body: string;
  tone: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        "rounded-2xl p-5 text-left transition",
        dark ? "bg-navy text-white" : "border border-dashed border-navy/25 bg-white/40",
        selected && "ring-2 ring-offset-2 ring-navy"
      )}
    >
      <h3 className="font-display text-xl">{title}</h3>
      <p className={clsx("mt-2 text-sm", dark ? "text-white/70" : "text-navy/65")}>
        {body}
      </p>
    </button>
  );
}
