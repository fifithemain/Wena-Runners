# WENA Runners — Negotiable Errands

WENA connects customers with verified local Runners. Customers post an errand and budget, Runners make offers, the customer accepts one, and a private hand-off PIN confirms completion.

## Stack
Next.js 14 · Clerk Authentication · Supabase Postgres/Storage · Yoco Checkout · Vercel.

## Vercel environment variables
Required: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`.
Payments: `PAYSTACK_SECRET_KEY` (Paystack secret key; keep server-side only). Configure Paystack webhook to `https://YOUR_DOMAIN/api/payments/webhook`.
Optional: `NEXT_PUBLIC_WHATSAPP_NUMBER`, `RESEND_API_KEY`, `EMAIL_FROM`.
Never expose service-role keys, Yoco secrets or admin password as `NEXT_PUBLIC_*` values.

## Launch checklist
1. Set all environment variables in Vercel Production and Preview.
2. Run `wena-runner/supabase/clerk-auth.sql` against the connected Supabase database before deploying the Clerk integration.
3. Set the Clerk publishable and secret keys from Clerk application `app_3KafaH3mrxevNppTrzuR3n8iq06`. Never commit these values.
4. Existing users must create a Clerk account with the same verified email address to reconnect their existing WENA profile. Supabase passwords and active sessions do not transfer; new users set their password through Clerk.
5. New Clerk users receive an internal Supabase Auth identity so existing UUID-based errand, message, and payout relationships continue working. Users authenticate with Clerk; do not use the internal Supabase identity to sign in. After cutover, disable public Supabase Auth sign-up and sign-in while retaining the server-side admin API used for these internal identities.
6. Register a Paystack webhook at `/api/payments/webhook` and test `charge.success` in Paystack test mode before live payments.
7. Run `npm ci && npm run build` from `wena-runner` and test customer/Runner/admin flows before production payments.
8. Do not process live payments until webhook reconciliation is verified.

The connected Supabase project already has the v3 tables. `wena-runner/supabase/v3-hardening.sql` is an additive migration (no data deletion).
