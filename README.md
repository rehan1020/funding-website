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
2. In the Supabase SQL editor run, in order: `supabase/schema.sql`, `supabase/rls.sql`, `supabase/storage.sql`, `supabase/seed.sql`.
3. `npm install`
4. `npm run dev`

## Security model
- **Service-role key and gateway secret are server-only.** Read via `src/lib/env.ts` `serverEnv` getters, imported only in route handlers / `server-only` modules. Never referenced in Client Components.
- **RLS is deny-by-default.** Founders read/write only their own `startups`; they can *read* their own `submissions`/`payments` but never write them — those tables have no client write policy and are mutated only by service-role API routes.
- **Queue position** is computed by `recompute_queue_positions()` (a `row_number()` window function, `security definer`, service-role only). Never set by the client.
- **Payments** are never trusted from the client redirect. `/api/checkout/session` creates the session server-side; `/api/webhooks/payment` verifies the signature *before* any DB write and is idempotent on `payments.provider_ref`.
- **Pitch decks** live in a private Storage bucket; access only via short-lived signed URLs generated server-side.

## Wiring the payment gateway
Implement `createCheckout()` and `verifyWebhook()` in `src/lib/payments/provider.ts` for the chosen provider, add a `case` in `getPaymentProvider()`, and set `PAYMENT_PROVIDER` / `PAYMENT_SECRET_KEY` / `PAYMENT_WEBHOOK_SECRET`. The stub fails closed until implemented.

## Auth note
The intake and checkout routes require an authenticated founder (magic-link session) — `founder_id` is taken from the session, never the request body. Add the magic-link sign-in UI before `/submit` in production.
