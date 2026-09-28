"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "@/lib/cx";

export interface AdminRow {
  id: string;
  status: string;
  reviewType: string;
  queuePosition: number | null;
  submittedAt: string;
  companyName: string;
  pitchSummary: string;
  website: string | null;
  socials: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  deckUrl: string | null;
}

const STATUSES = [
  "queued",
  "paid_priority",
  "under_review",
  "contacted",
  "rejected",
] as const;

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  paid_priority: "Paid · priority",
  under_review: "Under review",
  contacted: "Contacted",
  rejected: "Rejected",
};

// Prefilled WhatsApp message per status the admin can send with one click.
function waMessage(row: AdminRow, status: string): string {
  const name = row.contactName ?? "there";
  switch (status) {
    case "under_review":
      return `Hi ${name}, this is The Capital Room. Your submission for ${row.companyName} is now under review.`;
    case "contacted":
      return `Hi ${name}, The Capital Room would like to take the conversation about ${row.companyName} forward. Are you available to talk?`;
    case "rejected":
      return `Hi ${name}, thank you for submitting ${row.companyName} to The Capital Room. We won't be moving ahead at this time, but we appreciate the look.`;
    default:
      return `Hi ${name}, an update on your submission for ${row.companyName} from The Capital Room.`;
  }
}

function waLink(phone: string | null, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function AdminSubmissions({ initialRows }: { initialRows: AdminRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId: id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Update failed.");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-navy/60">{rows.length} submission(s)</p>
        <button onClick={logout} className="text-sm text-navy underline underline-offset-4">
          Sign out
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {rows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-navy/20 bg-white p-8 text-center text-navy/50">
          No submissions yet.
        </p>
      )}

      <div className="space-y-4">
        {rows.map((row) => {
          const chat = waLink(row.phone, waMessage(row, row.status));
          return (
            <div key={row.id} className="rounded-2xl border border-navy/10 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-2xl text-navy">{row.companyName}</h3>
                    {row.reviewType === "priority" && (
                      <span className="rounded-full bg-navy px-2.5 py-0.5 text-[0.65rem] uppercase tracking-eyebrow text-white">
                        Priority
                      </span>
                    )}
                    {row.queuePosition != null && (
                      <span className="text-xs text-navy/40">Queue #{row.queuePosition}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-navy/60">
                    {row.contactName} · {row.email} · {row.phone}
                  </p>
                </div>
                <span
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs",
                    row.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : row.status === "contacted"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-navy/5 text-navy/70"
                  )}
                >
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm text-navy/75">{row.pitchSummary}</p>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {row.website && (
                  <a
                    href={row.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-navy underline underline-offset-4"
                  >
                    Website
                  </a>
                )}
                {row.socials && <span className="text-navy/60">Socials: {row.socials}</span>}
                {row.deckUrl ? (
                  <a
                    href={row.deckUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-navy underline underline-offset-4"
                  >
                    View deck (PDF)
                  </a>
                ) : (
                  <span className="text-navy/40">No deck</span>
                )}
                {chat && (
                  <a
                    href={chat}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 underline underline-offset-4"
                  >
                    Message on WhatsApp
                  </a>
                )}
              </div>

              <div className="mt-5 flex items-center gap-3 border-t border-navy/10 pt-4">
                <label htmlFor={`status-${row.id}`} className="eyebrow text-navy/50">
                  Set status
                </label>
                <select
                  id={`status-${row.id}`}
                  value={row.status}
                  disabled={busyId === row.id}
                  onChange={(e) => updateStatus(row.id, e.target.value)}
                  className="rounded-lg border border-navy/15 bg-white px-3 py-1.5 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
