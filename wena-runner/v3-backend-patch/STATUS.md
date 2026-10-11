# WENA v3 backend implementation status

Branch: `feat/v3-negotiable-errands`

## Added on this branch
- Shared JSON error and money parsing helpers.
- Supabase Auth profile resolution for the v3 roles.
- Job lookup and participant check helper.
- Runner counter-offer submission endpoint.
- Participant-scoped offer polling endpoint.
- Integration notes describing the v2/v3 schema incompatibility.

## Not yet complete
- Offer acceptance and Yoco checkout flow.
- Hand-off PIN completion, cancellation, flagging and signed receipt endpoints.
- Polling chat, earnings and admin endpoints.
- v3 core database schema and verified migration.
- Frontend v3 rebuild and full `next build`.

## Blocking integration requirement
The existing `supabase/schema.sql` and app routes on `main` are still v2. Do not merge this branch into production until the v3 core schema, Auth/session flow, and route contracts are reconciled. The new endpoints require the `profiles`, `jobs`, and `job_offers` v3 tables described in the project progress notes.
