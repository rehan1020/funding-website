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
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
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
    return process.env.PAYMENT_PROVIDER ?? "stripe";
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
