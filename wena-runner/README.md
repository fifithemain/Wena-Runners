# WENA Runner Network — MVP

A simple site for the WENA Runner Network:
- Customers request an item from any store (delivery or self-collect)
- Runners who are familiar with a store claim the job, buy the item, and
  hand it to a WENA courier (or the customer collects themselves)
- You approve Runners and oversee jobs from a password-protected /admin page

## 1. Set up Supabase (free tier is fine)

1. Create a project at supabase.com
2. Go to the SQL Editor, paste in `supabase/schema.sql`, and run it
3. Go to Project Settings → API and copy your Project URL and the
   **service_role** key (not the anon key — this app uses the service
   role key server-side only, so it's never exposed to the browser)

## 2. Deploy to Vercel

1. Push this folder to a GitHub repo
2. On vercel.com, "Add New Project" → import that repo
3. Under Environment Variables, add everything from `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET` (any long random string)
   - `ADMIN_PASSWORD` (whatever you want to type into /admin)
   - `COURIER_FEE_DEFAULT` (e.g. `60`)
4. Deploy

## 3. Try it out

- `/` — landing page
- `/request` — customer request form
- `/signup` — Runner sign-up
- `/login` — Runner login (after you approve them in /admin)
- `/jobs` — the live job board (Runners only)
- `/admin` — approve Runners, watch jobs move through the board, mark
  completed once WENA's courier has delivered (or the customer has
  collected)

## How the money works

- **Shopper fee** (what a Runner earns): R70 / R90 / R110 depending on
  how many items — this is paid for finding + buying the item.
- **Courier fee**: a flat fee (`COURIER_FEE_DEFAULT`, editable in Vercel's
  environment variables without touching code) charged only when the
  customer wants it delivered rather than collecting themselves. This
  covers WENA's own courier leg, separate from the Runner's job.

## What's intentionally left for later

- Real SMS OTP login (right now it's phone number + a PIN the Runner sets
  themselves — no SMS costs, good enough to launch)
- Photo uploads for the item list
- Runner tiers / badges (Rookie → Verified → Elite) and the affiliate
  referral payouts we discussed — the `completed_jobs` count on each
  Runner is already being tracked, so this can be layered on top later
  without changing the data model
- A map picker instead of "use my current location" (this MVP uses the
  browser's built-in geolocation plus a landmark text field, which needs
  no map library or API key)
