# WENA Runners — Integrated Account & Role-Based Access Architecture

Status: approved architecture; first integrated Growth implementation built on the feature branch, with production activation gated on preview verification.

## 1. Product and identity decision

WENA Runners uses one person, one Clerk identity, and one canonical `profiles` row. Affiliate and Creator are additive business capabilities on that existing account. They are not separate account types, sign-up flows, or authentication realms.

The existing marketplace roles remain exactly as they are:

- `customer`
- `runner`
- `both`

Growth capabilities are independent of marketplace roles:

- `affiliate`
- `creator`
- `ambassador` (future extension)
- `business_partner` (future extension)

A person can be a customer and an affiliate, a runner and a creator, or hold any valid combination. The account identity, profile, email verification, login session, and account recovery remain shared.

**Do not** add affiliate or creator values to the existing marketplace `profiles.role` field. Do not create duplicate Clerk users or duplicate WENA profiles.

## 2. Conceptual model

```text
Clerk User (one identity)
        |
        | 1:1
        v
WENA profiles (one canonical person)
        |
        | 0:1
        v
marketing_partners (Growth partner workspace/account)
        |
        +-------------------------------+
        |                               |
        v                               v
marketing_partner_role_grants    marketing_partner_applications
        |                               |
        +-- affiliate                   +-- affiliate application
        +-- creator                     +-- creator application
        +-- ambassador (future)         +-- review decision
        +-- business_partner (future)
        |
        +----------------------+----------------------+
        |                      |                      |
        v                      v                      v
Affiliate capabilities   Creator capabilities   Shared partner services
- tracking links         - campaign briefs       - profile/settings
- referrals              - deliverables          - terms/consent
- attribution            - content review        - notifications
- verified conversions   - usage licenses        - audit history
- commission ledger      - creator fees          - payout requests
```

A partner can hold multiple role grants under the same `marketing_partners` row. Role-specific features are composed into one dashboard rather than separate portals.

## 3. Authorization model

Use database-backed role grants and server-side authorization. Clerk authenticates the person; WENA's database determines what that person is permitted to do.

### Role grant states

Each role grant has its own lifecycle:

- `pending`: requested; no protected role permissions.
- `active`: approved and currently usable.
- `suspended`: temporarily disabled; historical records remain.
- `revoked`: permanently withdrawn; historical records remain readable only where policy permits.

Suggested grant columns:

- `id`
- `partner_id`
- `role_key` (affiliate, creator, ambassador, business_partner)
- `status`
- `granted_by_profile_id`
- `granted_at`
- `suspended_at`, `revoked_at`
- `reason_code` and internal `review_note`
- `terms_version`, `accepted_at`
- `created_at`, `updated_at`

Enforce a unique active grant per `partner_id + role_key` (or use a unique row per partner/role and update its lifecycle fields). Keep an immutable audit event for every application, approval, suspension, reactivation, and revocation.

### Permission resolution

Define permissions in application code as a centrally maintained map. Do not let a browser choose its own permissions, and do not accept role claims from request bodies, query parameters, Clerk public/unsafe metadata, or local storage.

Examples:

| Capability | Required active grant |
|---|---|
| View Growth home and own application status | Signed-in WENA profile |
| Create/manage own affiliate tracking links | affiliate |
| View own affiliate attribution and commission ledger | affiliate |
| View eligible affiliate campaign offers | affiliate |
| View creator briefs and submit content | creator |
| Manage own creator deliverables and usage permissions | creator |
| View own creator fees and creator payout requests | creator |
| Review applications, manage campaigns, approve rewards | Existing authorized WENA admin gate |

For a user with both grants, the API returns the union of affiliate and creator capabilities. A suspended or revoked grant removes only the affected capability. It must not downgrade or lock the person's Customer/Runner account.

Every protected server action must:
1. Resolve the Clerk session.
2. Resolve the canonical WENA profile using the existing `getCurrentProfile()` helper.
3. Load the role grants from the database.
4. Check the required permission for the requested resource and action.
5. Enforce ownership/tenant scope (the partner may access only their own records).
6. Perform the operation through the server-side Supabase client.
7. Write an audit event for privileged or financially material changes.

Return `401` for unauthenticated requests and `403` for authenticated users without the required capability. Avoid leaking whether another partner, campaign, or attribution record exists.

## 4. Proposed database domain

All Growth tables are additive and separate from marketplace tables.

### Identity and role tables

**`marketing_partners`**
- One row per WENA profile that enters the Growth programme.
- `profile_id` is a unique FK to `profiles.id`.
- Stores partner-facing display name, contact preferences, onboarding state, and programme-level status.
- Does not duplicate Clerk identity, marketplace role, email, or wallet balance.

**`marketing_partner_role_grants`**
- One row per partner and capability.
- Holds role key, approval state, terms acceptance, grant/revocation metadata.
- This is the authorization source for affiliate/creator access.

**`marketing_partner_applications`**
- One application per partner and requested capability (or versioned application attempts).
- Stores answers required for that programme, application state, reviewer, timestamps, and decision reason.
- Do not collect unnecessary sensitive personal data.
- A user may apply for Creator after Affiliate approval, or vice versa.

**`marketing_audit_log`**
- Append-only record of role decisions, campaign changes, reward adjustments, payout approvals, and other privileged operations.
- Store actor profile, action, target type/id, timestamp, and minimal before/after metadata.
- Never store credentials, bank details, or secrets in audit payloads.

### Campaign and attribution tables

- `marketing_campaigns`: campaign owner, type, status, active dates, objective, eligibility, budget and versioned configuration.
- `marketing_campaign_roles`: roles eligible for each campaign; supports affiliate-only, creator-only, or combined campaigns.
- `marketing_campaign_assignments`: explicit creator/partner invitation or acceptance, deliverable expectations, agreed terms, and assignment status.
- `marketing_tracking_links`: unique partner-owned codes/URLs tied to a campaign and channel.
- `marketing_attributions`: first/last-touch attribution references, anonymous visitor key, source/medium, consent state and timestamps. Avoid raw IP storage.
- `marketing_conversions`: server-verified, idempotent conversion facts tied to qualifying business lifecycle events.

### Rewards and payment tables

- `marketing_reward_rules`: campaign and role-specific reward logic, currency (ZAR), caps, eligibility and effective dates.
- `marketing_reward_ledger`: append-only pending, approved, reversed and paid entries, each with an idempotency key and source reference.
- `marketing_payout_requests`: separate Growth partner payout workflow. Never reuse Runner `payouts`, Runner wallet balances, or marketplace earnings records.

Affiliate commission, creator fees, bonuses, and reimbursements should be identifiable by reward type and source. A creator who also earns affiliate commission must see both streams in one Growth view, with clear breakdowns and separate ledger entries.

### Creator-specific tables

- `marketing_creator_deliverables`: campaign assignment, brief version, submission reference, review status, feedback, due date, and approval timestamps.
- `marketing_creator_usage_licenses`: content reference, permitted channels, territory, start/end dates, paid-media permission, exclusivity, attribution requirements, and license status.
- Store large media in private object storage; persist storage references and metadata, not public unrestricted URLs.

Creator compensation is tied to an approved campaign assignment/deliverable and its agreed terms. It is not automatically treated as an affiliate conversion commission.

## 5. User experience

### Existing account and onboarding

1. User signs in or creates a normal WENA Runners account.
2. User opens **Growth** from their existing workspace.
3. User sees Affiliate and Creator programme cards with eligibility and terms.
4. User applies for one or both roles without creating another account.
5. Application status is visible as Pending, Approved, More information required, Declined, or Suspended.
6. On approval, the corresponding dashboard modules become available on the next session/API refresh.

Do not force every Runner or Customer to become a Growth partner. Growth participation is optional.

### Unified Growth dashboard

The dashboard is composed from active grants:

- **Overview:** combined performance and notifications.
- **Affiliate:** referral links, campaign links, clicks, attributed registrations, verified conversions, commission breakdown and payout status.
- **Creator:** available briefs, campaign invitations, content submissions, review feedback, usage licenses, deliverable deadlines and creator fees.
- **Earnings:** combined summary with separate Affiliate Commission and Creator Fee line items, ledger status, and Growth payout requests.
- **Profile & Terms:** partner profile, role-specific terms, consent, and application history.

If the person has only Affiliate, hide Creator-only actions. If they have only Creator, hide Affiliate-only actions. If they have both, show both modules in the same dashboard and avoid duplicate profile or payment setup.

### Admin workspace

Add Growth management to the existing WENA admin workspace and existing admin authorization gate:

- Review applications separately by role.
- Approve, request more information, decline, suspend, reactivate, and revoke role grants.
- Manage campaign role eligibility and partner assignments.
- Review creator deliverables and usage rights.
- Configure reward rules and caps.
- Review immutable reward ledger entries and approve Growth payouts.
- Inspect audit history and export campaign reporting.

Do not create a second admin identity or weaker admin password gate for Growth.

## 6. Financial, attribution, and integrity rules

- Initial affiliate commission qualification: an errand must be persisted as paid and subsequently completed through the existing customer hand-off PIN flow.
- A browser click, client event, registration alone, or client-supplied job status never earns commission.
- The conversion processor verifies the persisted job server-side and deduplicates using a unique source job/event key.
- Exclude self-referrals, test activity, cancelled jobs, disputes, refunds, and reversed transactions according to explicit programme terms.
- Later refunds or reversals create compensating ledger entries; never rewrite historical financial rows.
- Creator fees are based on agreed assignment terms and approved deliverables, not the affiliate attribution pipeline.
- Keep Growth money separate from Runner wallet and payout records.
- Do not store bank credentials in partner, campaign, attribution, event, or ledger JSON. Use a separately secured payout-provider workflow.
- Currency is explicitly stored; initial programme currency is ZAR.
- Commission rates, attribution model/window, caps, minimum payout threshold, and creator rates remain unconfigured until approved by WENA.

## 7. Security and privacy

- Clerk is the authentication provider; `profiles.id` is the canonical application principal.
- Role grants are database-backed and read only on the server for authorization.
- Never trust user-editable Clerk metadata for authorization.
- Enable RLS on every Growth table. Revoke direct browser write privileges to sensitive tables; route writes through authorized server endpoints.
- Service-role Supabase credentials remain server-only.
- Partner-facing queries are scoped by the resolved `partner_id`, never by an untrusted profile ID from the client.
- Admin routes require the established WENA admin gate and record an audit event.
- Add rate limits to applications, link creation, submissions, and payout requests.
- Validate uploaded media type/size, use private storage, and scan/ moderate content before publication.
- Minimize attribution data, document consent and retention, and provide a way to withdraw from marketing tracking where legally required.
- A Growth outage or feature flag must not block sign-in, errands, offers, payment, hand-off PIN completion, or Runner payouts.

## 8. API and application boundaries

Suggested routes:

- `/growth`: authenticated unified partner workspace.
- `/growth/apply`: role application flow.
- `/admin/marketing`: existing-admin-gated management workspace.
- `/api/marketing/me`: current partner profile, role grants, and capabilities.
- `/api/marketing/applications`: submit/read own applications.
- `/api/marketing/affiliate/*`: affiliate-only link and performance operations.
- `/api/marketing/creator/*`: creator-only campaign and deliverable operations.
- `/api/marketing/admin/*`: admin-only operations.
- Internal server event processor: verified marketplace conversion ingestion.

Keep these APIs outside the existing catch-all errand API. Reuse the current Clerk profile resolver and server-side Supabase client conventions.

## 9. Delivery plan

1. **Identity and access foundation:** additive partner and role-grant schema, application lifecycle, server-side permission resolver, audit log, RLS and authorization tests.
2. **Unified Growth shell:** role-aware dashboard, application forms, terms acceptance and application status.
3. **Affiliate module:** campaigns, tracking links, consent-aware attribution and verified conversion pipeline.
4. **Creator module:** campaign briefs, assignments, deliverable submission/review, content usage licenses and fee ledger.
5. **Shared rewards and payouts:** immutable ZAR ledger, separate affiliate/creator reward types, payout requests and admin approvals.
6. **Admin operations and analytics:** role review, campaign controls, fraud signals, reporting and exports.

Each phase is feature-flagged and must pass build, role matrix, RLS, ownership isolation, idempotency, financial reconciliation and marketplace regression tests before activation.

## 10. Acceptance criteria

- One Clerk user maps to exactly one WENA profile, regardless of role combination.
- Existing Customer/Runner flows and database contracts remain unchanged.
- A person can be Affiliate, Creator, or both on the same account.
- An Affiliate-only account cannot call Creator endpoints; a Creator-only account cannot call Affiliate endpoints.
- A user with both grants sees both modules without duplicate profile/payment setup.
- Suspending Affiliate access does not remove Creator access or Runner/Customer access.
- A partner cannot read or mutate another partner's applications, links, attribution, deliverables, ledger, or payout requests.
- Admin decisions are permission-checked and audited.
- Affiliate conversions and Creator deliverables cannot self-award money from browser-controlled events.
- Runner wallet/payout totals are not changed by Growth rewards.
- Feature flags default OFF and failure-isolated rollout preserves the marketplace.

## 11. Explicit non-goals for the first release

- Separate Affiliate/Creator login or profile.
- Multi-level/network marketing commissions.
- Automatic cash prizes for streaks or leaderboard positions.
- Unreviewed automatic creator publishing or broad content licenses.
- Automatic payout before reconciliation and admin approval.
- Replacing the existing Runner wallet, customer checkout, or Paystack flow.


## Implementation status — 22 November 2026

The first integrated Growth slice has been implemented on this feature branch:

- Additive Supabase schema for Growth partners, applications, independent Affiliate/Creator grants, campaigns, assignments, tracking links, consented attribution, verified conversions, reward rules, immutable ledger, payout requests, creator deliverables, and usage licences.
- Server-only APIs resolve the existing Clerk-linked WENA profile and check database-backed role grants. Existing `profiles.role` values and Runner/Customer account behaviour remain unchanged.
- Unified `/growth` workspace is added to the existing signed-in workspace navigation. Users can apply for Affiliate and/or Creator without creating another account.
- `/admin/marketing` supports application review, approval, suspension, reactivation and revocation of each capability.
- `/admin/marketing/campaigns` supports draft campaign creation, Affiliate reward-rule configuration, Creator invitations and deliverable review.
- Affiliate links use `/r/{code}`. Referral measurement is opt-in through a distinct cookie choice; no raw IP is stored. A signed-in workspace session claims the consented visitor attribution onto the existing WENA profile.
- The marketplace conversion trigger only awards an Affiliate commission after a persisted errand is both paid and completed, where the referral attribution is consented, within the attribution window, not self-referred, and backed by an active Affiliate grant, active campaign (when applicable), and enabled reward rule.
- Creator submissions are scoped to the assigned partner. Admin approval records the agreed Creator fee as a pending immutable Growth ledger entry; it does not automatically pay it.
- Growth tables have RLS enabled and no direct anon/authenticated grants. Admin and conversion RPCs are server-role-only. The reward ledger rejects UPDATE/DELETE and uses compensating entries.

### Rollout and unfinished controls

- `marketing_feature_flags.growth_enabled` remains **false**. The latest GitHub Actions Next.js production build passes and `npm audit` reports zero vulnerabilities; a current Vercel preview and authenticated end-to-end smoke test are still required before activation.
- Affiliate commission rules are disabled by default; WENA must explicitly configure and enable rates before activating an Affiliate campaign.
- No Creator fees or Affiliate commissions are paid automatically. Growth payout request review/transfer controls and final payout reconciliation remain a separate implementation step.
- Creator usage licences are modelled in the database but the consent/acceptance UI is not yet implemented.
- The existing admin console is password-header based; Growth deliberately reuses that same admin gate rather than creating a second admin identity. A centrally managed admin permission model should replace that legacy gate in a later security-hardening phase.
- This feature branch is not merged or deployed to production. Vercel refused another preview deployment because the deployment API daily limit had been reached; retry preview deployment when the limit resets. Keep the feature flag OFF until that preview and authenticated smoke test pass.


Referral consent handling note: if a first-time visitor arrives before choosing referral measurement, the short referral code remains in the page URL only until they make a cookie choice. The code is recorded as an attribution only after explicit referral consent; declining or choosing analytics-only removes it from the URL without creating an attribution row.


### Dependency security update

The application was upgraded from Next.js 14 / React 18 to Next.js 15.5.29 / React 19.2.3. PostCSS is pinned to 8.5.33 and Sharp to 0.35.5. The CI dependency audit now reports 0 total vulnerabilities, and the Next.js production build passes. Existing dynamic route handlers were migrated to asynchronous route parameters for Next.js 15 compatibility.



### Creator usage licence and Growth payouts

- Each Creator campaign invitation now carries a versioned usage-licence text snapshot. The Creator must read and explicitly accept that exact text before the invitation can be accepted. The accepted version and timestamp are recorded against the assignment; the admin must supply the licence wording before sending an invitation.
- Growth payout destinations are stored on the Growth partner record, separately from the existing Runner payout profile fields.
- Partners can request payouts per active Growth role from approved ledger balances. Pending and processing requests reserve the requested amount so it cannot be requested twice.
- Admin payout review progresses through pending → processing → paid or rejected. Marking paid requires a transfer reference and creates an immutable, idempotent paid ledger entry. No bank transfer is initiated automatically; WENA performs the transfer and records its reference.
- Payout request and settlement RPCs are service-role-only. Payout requests remain RLS-protected with no anon/authenticated table privileges.
- Database smoke tests covered request creation, balance reservation, overspend rejection, processing, paid settlement and the ledger entry. Test data was rolled back.
