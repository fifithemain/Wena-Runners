# WENA Runners — Integrated Marketing & Growth Architecture

Status: approved architecture; implementation gated on database availability and verification.

## Product decision

Marketing capabilities live inside the existing WENA Runners product and identity system. A person keeps one Clerk identity and one WENA profile. Customer and Runner roles remain unchanged; affiliate, creator, ambassador, and partner participation are additional, independently approved capabilities.

There is one Marketing & Growth area in the admin workspace and a Growth Partner area inside the signed-in user workspace. These are role-aware views over one marketing domain, not separate applications or authentication systems.

## Non-negotiable boundaries

- Do not change existing customer, Runner, errand, offer, negotiated-price, payment, hand-off PIN, or Runner payout contracts to add marketing.
- Do not add marketing commission amounts to the existing Runner wallet or `payouts` table.
- Keep all service-role Supabase access on the server. Browser clients never receive service-role credentials or direct write access to marketing tables.
- Enable RLS on every marketing table. Revoke direct access from `anon` and `authenticated`; server routes use the existing server-side service-role client after Clerk profile resolution and authorization.
- Marketing is feature-flagged OFF by default. A missing flag, unavailable database, or marketing error must not block errand creation, offers, checkout, payment webhooks, completion, or Runner payouts.
- Use append-only reward ledger entries with unique idempotency keys. Corrections are compensating entries; never silently rewrite historical rewards.
- Attribute conversions only to trusted server-side lifecycle events. A browser click, self-reported event, registration, or client-supplied job status cannot qualify a commission.
- Do not store bank details or other payout credentials in campaign metadata, attribution payloads, or the reward ledger.
- Do not use Clerk user-editable/unsafe metadata for authorization.

## Existing application integration

Current stack: Next.js 14 App Router, Clerk authentication, Supabase Postgres, Paystack checkout/webhook, Vercel.

Existing account roles are `customer`, `runner`, and `both`. Preserve them. Growth participation belongs in a separate `marketing_partners` relation keyed to `profiles.id`, allowing the same profile to be both a Runner and an approved affiliate/ambassador.

Proposed routes:
- `/admin/marketing`: admin-only campaign, partner, attribution, reward and analytics workspace.
- `/growth`: signed-in user application and approved partner dashboard.
- `/api/marketing`: server-side API for partner self-service and tracking.
- `/api/marketing/admin`: admin-only management operations.

Keep marketing routes and data access outside the existing catch-all errand API route. Reuse Clerk's existing `getCurrentProfile()` helper and server-side Supabase client conventions. Admin authorization must use the established admin gate until a dedicated, centrally managed admin permission system is implemented; do not create a second admin identity store.

## Domain model

All tables are additive and isolated under the marketing domain:

1. `marketing_feature_flags` — named kill switches; `marketing_growth_enabled` defaults to false.
2. `marketing_campaigns` — campaign identity, type, status, dates, objective, and versioned JSONB configuration.
3. `marketing_partners` — profile-linked affiliate, creator, ambassador, runner advocate, or business partner; approval state and tier.
4. `marketing_tracking_links` — unique codes/links attached to a campaign and optionally a partner.
5. `marketing_attributions` — first/last-touch attribution references, anonymous visitor key, source/medium, and attribution timestamps; avoid collecting raw IP addresses.
6. `marketing_conversions` — server-verified, idempotent conversion records tied to qualifying business events.
7. `marketing_reward_rules` — campaign/partner-specific fixed or percentage reward rules with caps and eligibility conditions.
8. `marketing_reward_ledger` — immutable pending, approved, reversed, and paid entries in ZAR.
9. `marketing_payout_requests` — separate partner payout workflow; never share Runner payout rows or balances.
10. `marketing_events` — minimal event inbox/outbox metadata for retryable, idempotent processing; do not use it as a general-purpose dump of personal data.

Use relational columns for ownership, state, money, status, and timestamps. Use versioned JSONB only for channel-specific settings that genuinely vary by campaign type. Add indexes for campaign status/date, partner profile/status, tracking code, attribution partner/campaign, conversion idempotency, and ledger partner/status.

## Initial qualifying conversion policy

For the first release, the only commission-eligible event should be a successfully paid errand that is subsequently completed through the existing customer hand-off PIN flow. Payment confirmation alone is not sufficient; completion alone is not sufficient if payment is unpaid. The event processor must verify the persisted job row server-side and use a unique source event/job key to prevent duplicate rewards.

Cancelled, disputed, refunded, reversed, test, and self-referred activity must not earn commission. Refunds or later reversals create a compensating ledger entry. The initial attribution model, attribution window, commission rate, caps, and VIP criteria must be configurable and explicitly approved before campaigns are activated.

## Admin and partner experiences

Admin:
- overview of acquisition, clicks, attributed signups, qualifying completed errands, spend, pending rewards, and paid rewards;
- campaign creation/editing and pause/stop controls;
- partner application review, approval, suspension, and tier changes;
- reward-rule management and payout approval;
- audit trail and exportable campaign reporting.

Partner:
- apply using their existing WENA account;
- approval state and programme terms;
- personal tracking links/codes and permitted campaign assets;
- clicks, attributed registrations, qualifying conversions, pending/approved/paid rewards;
- no access to other partners' profiles, customers, attribution records, or ledger entries.

## Delivery sequence

1. Foundation: additive schema, feature flag, server-only data access, audit/idempotency conventions, and security tests.
2. Partner onboarding: apply/review/approve flow and integrated `/growth` workspace.
3. Campaigns and tracking: admin campaign CRUD, unique partner links/codes, consent-aware attribution.
4. Verified conversion pipeline: payment + completed PIN event reconciliation, deduplication, reversals.
5. Rewards and payout: rule evaluation, immutable ZAR ledger, separate partner payout requests.
6. Analytics and advanced channels: creator tiers, campus ambassadors, business partnerships, Meta/TikTok integrations, UGC rights tracking.

Each phase ships behind feature flags and must pass build, authorization, RLS, idempotency, and core marketplace regression checks before activation.

## Current deployment gate

The connected Supabase project `Wena Runners` (ref `tejocurqovsvrkhgmyza`) was reported as INACTIVE when this architecture was prepared. Do not apply migrations, run database mutations, or deploy marketing features until the project is restored and the live schema/migration history is re-inspected. The current Supabase changelog also notes that new public tables are no longer automatically exposed to the Data API; migrations must explicitly grant only the required server role and keep RLS enabled.
