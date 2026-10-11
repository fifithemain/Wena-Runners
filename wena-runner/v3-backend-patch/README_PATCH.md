# WENA v3 backend patch (negotiable errands)

This folder documents the v3 backend patch and its integration requirements. The repository's existing app still uses the v2 fixed-tier `runners` schema and Runner-only signed sessions. Do not merge these routes into the current app until the v3 core schema and Supabase Auth session helper are present.

## Planned endpoints
- `POST /api/jobs/[id]/offer` — Runner counter-offer.
- `GET /api/jobs/[id]/offers` — participant-scoped offer polling.
- `POST /api/jobs/[id]/offers/[offerId]/accept` — customer accepts a counter-offer and starts Yoco checkout.
- `POST /api/jobs/[id]/complete` — validates the hand-off PIN atomically and sends best-effort completion email.
- `POST /api/jobs/[id]/cancel` and `POST /api/jobs/[id]/flag` — participant-scoped cancellation/flagging.
- `GET /api/jobs/[id]/receipt` — short-lived signed receipt URL with participant/assignment checks.
- `GET/POST /api/jobs/[id]/messages` — polling-based in-app chat.
- `GET /api/runner/earnings` — completed work, payout history and balance.
- `GET/POST /api/admin/{runners,jobs,payouts}` — admin listing/moderation/payout recording.

## Integration prerequisites
1. Apply the v3 core schema first. The current `supabase/schema.sql` is v2 and is incompatible.
2. Use the v3 Supabase Auth session helper. Do not reuse the checked-in HMAC Runner-only `lib/auth.ts`.
3. The v3 `jobs` table must provide `customer_id`, `runner_id`, `budget`, `agreed_budget`, `status`, `payment_status`, `receipt_path`, `handoff_pin`, and `completed_at`. `job_offers` must provide `amount`, `status`, `customer_id`, `runner_id`, `job_id`, and `updated_at`.
4. Add `resend` as a dependency if using email notifications. If customer/Runner emails are stored in `profiles`, fetch those profiles before sending.
5. A verified Yoco webhook must mark payment as paid and move the job to `in_progress`. Creating a checkout URL alone must not mark it paid.
6. Confirm the payout amount unit (rand vs cents) before applying payout code.
7. Keep all secrets in GitHub/Vercel environment settings, never in source control.

## Validation
This is an integration plan, not a verified production build. Run `npx tsc --noEmit` and `npx next build` only after the v3 schema/auth helpers have been reconciled. The existing public main branch is still v2.
