# WENA Runner Network — v2.0 (slip-based, zero Runner capital)

- The **customer pays the store directly** (in person, EFT, however the
  store takes payment) and uploads their slip/receipt when requesting a
  Runner. WENA only ever charges the Runner's service fee + courier fee —
  never the price of the goods. Runners never front their own money.
- A **Runner** who knows a store claims the job, shows the slip at the
  counter to collect the pre-paid order, hands it to a WENA courier (or
  the customer collects themselves), then **completes the job by entering
  a hand-off PIN** the customer gives them once they've actually received
  it. That's what credits the Runner's earnings — not a status button.
- Runners sign up with an **ID document + a selfie**, and only start
  seeing jobs once approved.
- A Runner can **flag a slip** if a store rejects it as invalid; flagged
  jobs land in a "Flagged / Disputed" queue in `/admin` for you to reopen
  or cancel.
- Once approved, a Runner can set a **payout method** and track earnings,
  balance, and payout history at `/earnings`.
- You run everything else from a password-protected `/admin` page.

## 1. Set up Supabase

**Fresh project:** SQL Editor -> paste `supabase/schema.sql` -> run.

**Already running the v1 app?** Run `supabase/migrations_2.sql` then
`supabase/migrations_3.sql`, in that order — they only add what's new
without touching existing Runners or jobs.

> If you're working with me (Claude) directly and Supabase is connected
> in this chat, I can run these for you instead of you pasting SQL.

Then go to Project Settings -> API and copy your Project URL and the
**service_role** key (used server-side only, never exposed to the browser).

## 2. Set up Yoco

1. Create a Yoco account, then in the Yoco Business Portal go to
   **Sell Online -> Payment Gateway** to get your test (and later live)
   secret key (`sk_test_...` / `sk_live_...`).
2. Register a webhook so payments actually confirm: use the
   **Checkout API -> Webhooks** option (or email online@yoco.com) to
   register `https://YOUR-DEPLOYED-URL.vercel.app/api/payments/webhook`
   listening for `payment.succeeded` and `payment.failed`. This gives you
   a **webhook secret** (`whsec_...`) — save it.
3. Until you've done this, leave `YOCO_SECRET_KEY` blank — the app skips
   payment and puts requests straight on the board, so you can test
   everything else first.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo (I can't push to GitHub or deploy to
   Vercel myself — no tool gives me write access to either, only to your
   Supabase database. This part needs you, or Claude Code / Claude in
   Chrome if you want it automated from your side.)
2. On vercel.com, "Add New Project" -> import that repo
3. Add every variable from `.env.example` under Environment Variables
4. Deploy
5. Set `NEXT_PUBLIC_SITE_URL` to your real deployed URL, then redeploy
   (Yoco needs exact success/cancel links)

## Try it out

- `/` — home page: pay the store, upload your slip, request a Runner
- `/signup` — Runner sign-up (ID document + selfie required)
- `/login` — Runner login (after you approve them in `/admin`)
- `/jobs` — the live job board (Runners only) — view the slip once
  claimed, flag it if the store rejects it, complete with the hand-off PIN
- `/earnings` — a Runner's earnings, payout method, and payout history
- `/admin` — approve Runners (view ID + selfie first), watch jobs move,
  resolve flagged/disputed jobs, record payouts

## How the money works

- **Shopper (Runner) fee**: R70 / R90 / R110 by item count
- **Courier fee**: flat `NEXT_PUBLIC_COURIER_FEE` (R60 by default), only
  when delivered rather than collected
- **Customer pays WENA**: shopper fee + courier fee only, via Yoco — never
  the cost of the goods, since that already went to the store directly
- **Hand-off PIN**: generated when the job is created, shown to the
  customer on the payment success page. The Runner enters it to mark the
  job complete, which is what credits their earnings — this is the
  safeguard against a Runner marking a job "done" without it actually
  reaching the customer
- **Payouts**: a Runner's balance is completed-job earnings minus what
  you've recorded as paid in `/admin`. Recording a payout there doesn't
  move money — it's your record of having paid them via their chosen
  method (bank transfer, eWallet, cash)

## What's intentionally left for later

- Real SMS OTP login (still phone number + a PIN the Runner sets)
- Runner tiers / badges (Rookie -> Verified -> Elite) and affiliate
  referral payouts — `completed_jobs` is already tracked per Runner
- A map picker instead of "use my current location" plus a landmark field
- Refunds through the app for cancelled/disputed jobs (Yoco supports
  this via the Checkout API, not yet wired up here)
- Sending the hand-off PIN via WhatsApp/SMS as a backup to the on-screen
  display (right now it only shows once, on the success page)
