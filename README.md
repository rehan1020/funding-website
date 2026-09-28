# The Capital Room

Private access for investor-ready companies. Next.js 14 (App Router) + Supabase, deployable on Vercel.

## Stack
- **Next.js 14 App Router**, TypeScript, Tailwind CSS
- **Supabase**: Postgres, Auth (magic link), Storage (private pitch-deck bucket)
- **Payments**: gateway-agnostic adapter (`src/lib/payments/provider.ts`) — wire up the chosen gateway once selected

## Pages
| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/submit` | Founder intake form |
| `/pay/priority` | Priority checkout landing |
| `/submitted` | Confirmation |
| `/network-legal` | Services + VC network |

## Setup
1. `cp .env.example .env.local` and fill values.
2. In the Supabase SQL editor run, in order: `supabase/schema.sql`, `supabase/rls.sql`, `supabase/storage.sql`, `supabase/seed.sql`, then `supabase/migration_v2.sql`.
3. Create your admin login: Supabase → Authentication → Users → Add user (email + password), then in `migration_v2.sql` insert that user's id/email into `admins`.
4. `npm install`
5. `npm run dev`

## Security model
- **Service-role key and gateway secret are server-only.** Read via `src/lib/env.ts` `serverEnv` getters, imported only in route handlers / `server-only` modules. Never referenced in Client Components.
- **RLS is deny-by-default.** Founders do not log in; after `migration_v2.sql` the data tables have no client policies at all, so every read/write goes through server-only API routes using the service-role key. Admins are gated by membership in the `admins` table.
- **Queue position** is computed by `recompute_queue_positions()` (a `row_number()` window function, `security definer`, service-role only). Never set by the client.
- **Payments** are never trusted from the client redirect. `/api/checkout/session` creates the session server-side; `/api/webhooks/payment` verifies the signature *before* any DB write and is idempotent on `payments.provider_ref`.
- **Pitch decks** live in a private Storage bucket; access only via short-lived signed URLs generated server-side (admins view them from the dashboard).

## Wiring the payment gateway
Priority review is optional. Implement `createCheckout()` and `verifyWebhook()` in `src/lib/payments/provider.ts` for the chosen provider, add a `case` in `getPaymentProvider()`, and set `PAYMENT_PROVIDER` / `PAYMENT_SECRET_KEY` / `PAYMENT_WEBHOOK_SECRET`. The stub fails closed until implemented.

## Founders, admins & WhatsApp
- **Founders do not sign in.** `/submit` is a public form capturing name, email, WhatsApp number, company, pitch summary, optional website/socials, and an optional PDF deck. All writes go through `/api/submit` (service-role).
- **Admins** sign in at `/admin/login` (unlinked / hidden) with email + password, gated by the `admins` table. `/admin` lists every submission, opens decks in-browser via signed URLs, and updates status.
- **Status updates over WhatsApp** are manual click-to-chat: the dashboard builds a `wa.me` link with a prefilled message per status for the admin to send.

