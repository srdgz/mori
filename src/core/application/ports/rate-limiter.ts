export type RateRule = { max: number; windowSeconds: number };

export interface RateLimiter {
  hit(key: string, rule: RateRule): Promise<boolean>;
}

export const RATE_RULES = {
  signIn: { max: 5, windowSeconds: 60 },
  signUp: { max: 5, windowSeconds: 600 },
  passwordReset: { max: 3, windowSeconds: 600 },
  coupon: { max: 10, windowSeconds: 600 },
} as const satisfies Record<string, RateRule>;
