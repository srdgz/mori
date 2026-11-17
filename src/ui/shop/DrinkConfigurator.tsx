"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { configureDrink, defaultSelection, lineTotal, MAX_QUANTITY } from "@/core/domain/catalog/configuration";
import type { OptionGroup, OptionId } from "@/core/domain/catalog/options";
import type { Product } from "@/core/domain/catalog/product";
import { localize, type Locale } from "@/core/domain/shared/locale";
import { formatMoney } from "@/core/domain/shared/money";
import { Icon } from "@/ui/primitives/Icon";
import { cart } from "./cart-store";

export type ConfiguratorLabels = {
  configure: string;
  optional: string;
  soldOutOption: string;
  quantity: string;
  less: string;
  more: string;
  unitPrice: string;
  add: string;
  added: string;
};

type Props = { product: Product; locale: Locale; labels: ConfiguratorLabels };

function initialSelection(product: Product): Record<string, OptionId[]> {
  const chosen = new Set(defaultSelection(product));
  return Object.fromEntries(product.optionGroups.map((g) => [g.id, g.options.filter((o) => chosen.has(o.id)).map((o) => o.id)]));
}

function fill(template: string, price: string): string {
  return template.replace("{price}", price);
}

export function DrinkConfigurator({ product, locale, labels }: Props) {
  const formId = useId();
  const [selection, setSelection] = useState(() => initialSelection(product));
  const [quantity, setQuantity] = useState(1);

  const groups = useMemo(() => [...product.optionGroups].sort((a, b) => a.sort - b.sort), [product]);
  const drink = configureDrink(product, Object.values(selection).flat());
  const total = formatMoney(lineTotal(drink, quantity), locale);

  function choose(group: OptionGroup, id: OptionId, checked: boolean) {
    setSelection((current) => {
      const picked = current[group.id] ?? [];
      const next = group.selection === "single" ? [id] : checked ? [...picked, id] : picked.filter((o) => o !== id);
      return { ...current, [group.id]: next };
    });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    cart.add({ productId: product.id, optionIds: Object.values(selection).flat(), quantity }, labels.added.replace("{name}", product.name));
    setQuantity(1);
  }

  return (
    <form className="configurator" onSubmit={onSubmit} aria-labelledby={`${formId}-title`}>
      <h2 id={`${formId}-title`} className="eyebrow text-forest">
        {labels.configure}
      </h2>

      {groups.map((group) => (
        <fieldset key={group.id} className="opt-group">
          <legend className="opt-group__legend">
            {localize(group.name, locale)}
            {!group.required && <span className="opt-group__hint">{labels.optional}</span>}
          </legend>
          <div className="opt-grid">
            {[...group.options]
              .sort((a, b) => a.sort - b.sort)
              .map((option) => {
                const checked = selection[group.id]?.includes(option.id) ?? false;
                return (
                  <label key={option.id} className="opt">
                    <input
                      type={group.selection === "single" ? "radio" : "checkbox"}
                      name={`${formId}-${group.code}`}
                      value={option.code}
                      checked={checked}
                      disabled={!option.isAvailable}
                      onChange={(e) => choose(group, option.id, e.currentTarget.checked)}
                    />
                    <span>{localize(option.name, locale)}</span>
                    {option.priceDelta.cents > 0 && <span className="opt__delta">+{formatMoney(option.priceDelta, locale)}</span>}
                    {!option.isAvailable && <span className="opt__delta">· {labels.soldOutOption}</span>}
                  </label>
                );
              })}
          </div>
        </fieldset>
      ))}

      <div className="buy-bar">
        <div className="qty" role="group" aria-label={labels.quantity}>
          <button type="button" aria-label={labels.less} disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
            <Icon name="minus" size={16} />
          </button>
          <output aria-live="polite" aria-label={labels.quantity}>
            {quantity}
          </output>
          <button
            type="button"
            aria-label={labels.more}
            disabled={quantity >= MAX_QUANTITY}
            onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
        <button type="submit" className="btn btn--matcha buy-bar__cta">
          <span aria-live="polite">{fill(labels.add, total)}</span>
        </button>
      </div>
      <p className="buy-bar__unit">{fill(labels.unitPrice, formatMoney(drink.unitPrice, locale))}</p>
    </form>
  );
}
