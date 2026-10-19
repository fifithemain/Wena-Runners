# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Customers in South Africa who need a local errand completed and want to set a budget and choose a Runner. Runners are verified local people who browse available errands and make offers. An account may support customer, Runner, or both roles.

## Product Purpose

WENA Runners connects customers with local Runners for errands. Success means customers can agree a fair price and get an errand completed, while Runners can find work and track their earnings.

## Positioning

Customers set the budget and can compare, accept, or counter Runner offers; the fare is negotiated directly instead of selected from fixed tiers. A private hand-off PIN confirms completion.

## Operating Context

The product is a South African marketplace using rand (ZAR). Customers post an errand with a category, description, pickup and drop-off details, requested budget, and, for some categories, a receipt or proof of payment. Verified Runners can browse errands and make or update offers. Customers can accept or counter offers, pay for an accepted errand, message the assigned Runner, and confirm completion with a hand-off PIN. Runners can track earnings and request payouts.

## Capabilities and Constraints

- Authentication uses Clerk when configured.
- Errands, offers, chat, and wallet data are served through the existing Next.js API and Supabase integration.
- Accepted offers require payment before the errand becomes active.
- Errand participants can access the errand chat and any required receipt.
- Runner payouts are requested in-app and processed within 3–7 business days.
- Preserve the existing API contracts, authorization, payment, PIN, and payout behavior when changing the interface.
- Do not imply that an errand is complete until the customer confirms it with the hand-off PIN.

## Brand Commitments

The product name is WENA Runners. Keep customer and Runner roles legible as distinct paths within the same product.

## Evidence on Hand

The repository README and application routes document the product flows and implementation. No approved customer testimonials, performance claims, or product photography are present in the repository; do not present invented material as real.

## Product Principles

- Keep the customer's budget and choice central.
- Make offers and agreed prices clear to both sides.
- Treat verification, payment, chat, and the hand-off PIN as trust-critical states.
- Make customer and Runner workspaces understandable without hiding the two-sided marketplace.
- Communicate financial activity in South African rand.
