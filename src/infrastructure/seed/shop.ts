export const deliveryPostalCodes = ["28004", "28005", "28010", "28012", "28013", "28015"];

export const couponSeed = [
  { code: "BIENVENIDA10", kind: "percent", value: 10, firstOrderOnly: true, minSubtotalCents: 0, perCustomerLimit: 1 },
  { code: "MATCHAMIGO", kind: "amount", value: 200, firstOrderOnly: false, minSubtotalCents: 1500, perCustomerLimit: null },
] as const;
