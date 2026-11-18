import { can } from "@/core/domain/access/actor";
import { loyaltyCard, type LoyaltyCard } from "@/core/domain/promotions/loyalty";
import { currentActor } from "../checkout/tracking";
import type { LoyaltyRepository, SettingsRepository } from "../ports/checkout";
import type { Identity } from "../ports/identity";

export function makeGetLoyaltyCard(deps: { identity: Identity; loyalty: LoyaltyRepository; settings: SettingsRepository }) {
  return async (): Promise<LoyaltyCard | null> => {
    const actor = await currentActor(deps.identity);
    if (actor.kind === "guest" || !can(actor, "loyalty.redeem")) return null;
    const [stamps, settings] = await Promise.all([deps.loyalty.balance(actor.id), deps.settings.load()]);
    return loyaltyCard(stamps, settings.loyaltyStampsRequired);
  };
}
