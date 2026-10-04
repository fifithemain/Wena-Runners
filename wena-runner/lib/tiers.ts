// v2.0 model: the customer pays the store directly and uploads proof.
// WENA only ever charges the Runner service fee + (optionally) the
// courier fee — never the price of the goods themselves.
export const TIERS = {
  small: { label: "1 to 5 items", runnerCut: 70 },
  medium: { label: "6 to 10 items", runnerCut: 90 },
  heavy: { label: "Heavy / bulky items", runnerCut: 110 },
} as const;

export type TierKey = keyof typeof TIERS;

// Flat WENA courier fee for the delivery leg (Runner -> customer address).
// Not charged when the customer chooses store pickup instead.
// Change this via the NEXT_PUBLIC_COURIER_FEE env var (needs a redeploy to take effect).
export const COURIER_FEE = Number(process.env.NEXT_PUBLIC_COURIER_FEE || 60);

export function totalForTier(tier: TierKey, fulfillmentType: FulfillmentType) {
  return TIERS[tier].runnerCut + (fulfillmentType === "delivery" ? COURIER_FEE : 0);
}

export type FulfillmentType = "delivery" | "pickup";

// Front-of-list partner stores. Add or rename here; "Other" is always offered too.
export const PARTNER_STORES = [
  { name: "Peoples Market", url: "https://www.facebook.com/profile.php?id=61576835366849" },
  { name: "Yaya Trading", url: "https://www.facebook.com/profile.php?id=61557407364279" },
  { name: "Payless Trading", url: "https://www.facebook.com/profile.php?id=61588453663462" },
];

export const STORE_PRESETS = [...PARTNER_STORES.map((s) => s.name), "Other"];
