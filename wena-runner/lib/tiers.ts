// The shopper fee: what a Runner earns for finding + buying the item.
// This is separate from the courier fee, since a different WENA courier
// leg handles the actual drop-off to the customer.
export const TIERS = {
  small: { label: "1 to 5 items", fee: 130, runnerCut: 70 },
  medium: { label: "6 to 10 items", fee: 180, runnerCut: 90 },
  heavy: { label: "Heavy / bulky items", fee: 220, runnerCut: 110 },
} as const;

export type TierKey = keyof typeof TIERS;

// Flat WENA courier fee for the delivery leg (Runner -> customer address).
// Not charged when the customer chooses store pickup instead.
// Change this via the COURIER_FEE env var without redeploying code.
export const COURIER_FEE = Number(process.env.COURIER_FEE_DEFAULT || 60);

export type FulfillmentType = "delivery" | "pickup";

export const STORE_PRESETS = [
  "Shoprite",
  "Boxer",
  "Pick n Pay",
  "Spar",
  "OK Foods",
  "Checkers",
  "Other",
];
