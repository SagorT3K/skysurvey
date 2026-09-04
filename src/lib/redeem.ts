// Redeem methods and fixed payout amounts shared by the user form, the API and the admin panel.
// The method string is stored directly in RedeemRequest.method (no schema change needed).

export const REDEEM_METHODS = [
  { id: "paypal", label: "PayPal", group: "paypal" },
  { id: "giftcard_amazon", label: "Amazon", group: "giftcard" },
  { id: "giftcard_netflix", label: "Netflix", group: "giftcard" },
  { id: "giftcard_starbucks", label: "Starbucks", group: "giftcard" },
  { id: "giftcard_uber", label: "Uber", group: "giftcard" },
  { id: "giftcard_visa", label: "Visa", group: "giftcard" },
  { id: "crypto_btc", label: "Bitcoin", group: "crypto" },
  { id: "crypto_usdt", label: "USDT", group: "crypto" },
] as const;

export type RedeemMethodId = (typeof REDEEM_METHODS)[number]["id"];

export const REDEEM_METHOD_IDS: Set<string> = new Set(
  REDEEM_METHODS.map((m) => m.id),
);

// Fixed cashout options in US cents: $5, $10, $15.
export const REDEEM_AMOUNT_CENTS = [500, 1000, 1500] as const;

export function methodLabel(method: string): string {
  const m = REDEEM_METHODS.find((x) => x.id === method);
  if (!m) return method;
  if (m.group === "giftcard") return `Gift card · ${m.label}`;
  if (m.group === "crypto") return `Crypto · ${m.label}`;
  return m.label;
}
