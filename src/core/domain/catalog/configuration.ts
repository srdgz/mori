import { DomainError } from "../shared/domain-error";
import { add, multiply, type Money } from "../shared/money";
import type { Option, OptionGroup, OptionId } from "./options";
import type { Product } from "./product";

export const MAX_QUANTITY = 20;

export type Choice = Readonly<{ group: OptionGroup; options: readonly Option[] }>;

export type ConfiguredDrink = Readonly<{
  product: Product;
  choices: readonly Choice[];
  unitPrice: Money;
}>;

function groupsInOrder(product: Product): OptionGroup[] {
  return [...product.optionGroups].sort((a, b) => a.sort - b.sort);
}

function optionsInOrder(group: OptionGroup): Option[] {
  return [...group.options].sort((a, b) => a.sort - b.sort);
}

export function defaultSelection(product: Product): OptionId[] {
  return groupsInOrder(product).flatMap((group) => {
    const available = optionsInOrder(group).filter((o) => o.isAvailable);
    const preferred = available.find((o) => o.id === group.defaultOptionId);
    if (preferred) return [preferred.id];
    if (group.required && available[0]) return [available[0].id];
    return [];
  });
}

export function configureDrink(product: Product, optionIds: readonly OptionId[]): ConfiguredDrink {
  if (!product.isAvailable) throw new DomainError("catalog.product_unavailable", `${product.slug} is not available`);

  const wanted = new Set(optionIds);
  if (wanted.size !== optionIds.length) throw new DomainError("catalog.option_duplicated", "An option was chosen twice");

  const offered = new Set(product.optionGroups.flatMap((g) => g.options.map((o) => o.id)));
  const unknown = optionIds.find((id) => !offered.has(id));
  if (unknown) throw new DomainError("catalog.option_not_offered", `${product.slug} does not offer option ${unknown}`);

  const choices = groupsInOrder(product).map((group) => {
    const options = optionsInOrder(group).filter((o) => wanted.has(o.id));
    if (options.some((o) => !o.isAvailable))
      throw new DomainError("catalog.option_unavailable", `An option in ${group.code} is not available`);
    if (group.required && options.length === 0) throw new DomainError("catalog.option_required", `${group.code} needs a choice`);
    if (group.selection === "single" && options.length > 1)
      throw new DomainError("catalog.option_single", `${group.code} allows one choice`);
    return { group, options };
  });

  const unitPrice = add(product.price, ...choices.flatMap((c) => c.options.map((o) => o.priceDelta)));
  return { product, choices: choices.filter((c) => c.options.length > 0), unitPrice };
}

export function lineTotal(drink: ConfiguredDrink, quantity: number): Money {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new DomainError("catalog.invalid_quantity", `Quantity must be between 1 and ${MAX_QUANTITY}`);
  }
  return multiply(drink.unitPrice, quantity);
}
