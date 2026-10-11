# WENA Runners v3 — Negotiable Errands

WENA connects customers with verified local Runners. Customers post an errand and budget, Runners make offers, the customer accepts one, and a private hand-off PIN confirms completion.

## Stack
Next.js 14 · Supabase Auth/Postgres/Storage · Yoco Checkout · Vercel.

## Vercel environment variables
Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`.
Payments: `PAYSTACK_SECRET_KEY` (Paystack secret key; keep server-side only). Configure Paystack webhook to `https://YOUR_DOMAIN/api/payments/webhook`.
Optional: `NEXT_PUBLIC_WHATSAPP_NUMBER`, `RESEND_API_KEY`, `EMAIL_FROM`.
Never expose service-role keys, Yoco secrets or admin password as `NEXT_PUBLIC_*` values.

## Launch checklist
1. Set all environment variables in Vercel Production and Preview.
2. Configure Supabase Auth email/password, site URL and redirect URLs.
3. Register a Paystack webhook at `/api/payments/webhook` and test `charge.success` in Paystack test mode before live payments.
4. Run `npm ci && npm run build` from `wena-runner` and test customer/Runner/admin flows before production payments.
5. Do not process live payments until webhook reconciliation is verified.

The connected Supabase project already has the v3 tables. `wena-runner/supabase/v3-hardening.sql` is an additive migration (no data deletion).
