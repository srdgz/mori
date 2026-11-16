import type { Option, OptionGroup, OptionGroupId, OptionId } from "@/core/domain/catalog/options";
import type { Product, ProductId } from "@/core/domain/catalog/product";
import { money } from "@/core/domain/shared/money";

const text = { es: "x", en: "x" };

export function option(code: string, overrides: Partial<Option> = {}): Option {
  return { id: `opt-${code}` as OptionId, code, name: text, priceDelta: money(0), isAvailable: true, sort: 1, ...overrides };
}

export function group(code: string, options: Option[], overrides: Partial<OptionGroup> = {}): OptionGroup {
  return {
    id: `grp-${code}` as OptionGroupId,
    code,
    name: text,
    selection: "single",
    required: true,
    sort: 1,
    options,
    defaultOptionId: null,
    ...overrides,
  };
}

export function product(overrides: Partial<Product> & Pick<Product, "slug">): Product {
  return {
    id: overrides.slug as ProductId,
    name: overrides.slug,
    imageKey: overrides.slug,
    price: money(500),
    cupColor: "#b6d66b",
    cupName: text,
    shortDescription: text,
    description: text,
    alt: text,
    tags: [],
    isVegan: false,
    isAvailable: true,
    isFeatured: false,
    sort: 1,
    optionGroups: [],
    ...overrides,
  };
}
