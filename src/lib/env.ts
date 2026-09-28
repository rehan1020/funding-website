// Centralised env access. Server-only secrets are read lazily and must never
// be imported into a Client Component.

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// Public — safe in the browser.
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  // Falls back to Vercel's auto-injected deployment host when the site URL
  // isn't set yet, so the app works on the first deploy before a URL exists.
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
};

// Server-only — throws if referenced without being set.
export const serverEnv = {
  get serviceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get deckBucket() {
    return process.env.SUPABASE_DECK_BUCKET ?? "pitch-decks";
  },
  get paymentProvider() {
    return process.env.PAYMENT_PROVIDER ?? "cashfree";
  },
  // Cashfree PG credentials (full API). "App ID" = x-client-id, "Secret Key" =
  // x-client-secret. The Secret Key also signs webhooks, so no separate webhook
  // secret is needed for Cashfree.
  get cashfreeAppId() {
    return required("CASHFREE_APP_ID", process.env.CASHFREE_APP_ID);
  },
  get cashfreeSecretKey() {
    return required("CASHFREE_SECRET_KEY", process.env.CASHFREE_SECRET_KEY);
  },
  // "production" (default) or "sandbox". Drives the API base URL and the mode
  // passed to the browser SDK.
  get cashfreeMode(): "production" | "sandbox" {
    return process.env.CASHFREE_ENV === "sandbox" ? "sandbox" : "production";
  },
  get cashfreeApiBase() {
    return this.cashfreeMode === "sandbox"
      ? "https://sandbox.cashfree.com/pg"
      : "https://api.cashfree.com/pg";
  },
  // Hosted payment form URL (e.g. a Cashfree Payment Form link). Used by the
  // legacy "hosted_form" provider — no API keys required.
  get paymentFormUrl() {
    return required("PAYMENT_FORM_URL", process.env.PAYMENT_FORM_URL);
  },
  get paymentSecretKey() {
    return required("PAYMENT_SECRET_KEY", process.env.PAYMENT_SECRET_KEY);
  },
  get paymentWebhookSecret() {
    return required("PAYMENT_WEBHOOK_SECRET", process.env.PAYMENT_WEBHOOK_SECRET);
  },
  get priorityAmount() {
    return Number(process.env.PRIORITY_PRICE_AMOUNT ?? "25000");
  },
  get priorityCurrency() {
    return process.env.PRIORITY_PRICE_CURRENCY ?? "INR";
  },
};
