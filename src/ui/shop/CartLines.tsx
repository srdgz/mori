"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { lineKey, type PricedCart } from "@/core/domain/cart/cart";
import { MAX_QUANTITY } from "@/core/domain/catalog/configuration";
import type { Product } from "@/core/domain/catalog/product";
import { localize, type Locale } from "@/core/domain/shared/locale";
import { formatMoney } from "@/core/domain/shared/money";
import { Link } from "@/i18n/navigation";
import { productPhoto } from "@/ui/brand/photos";
import { Icon } from "@/ui/primitives/Icon";
import { cart } from "./cart-store";

export function CartIssues({ priced, catalog }: { priced: PricedCart; catalog: readonly Product[] }) {
  const t = useTranslations("shop.cart");
  if (priced.issues.length === 0) return null;
  return (
    <ul className="grid gap-2" role="alert">
      {priced.issues.map((issue) => {
        const name = catalog.find((p) => p.id === issue.line.productId)?.name ?? "";
        return (
          <li key={lineKey(issue.line)} className="form-note flex items-start justify-between gap-3">
            <span>{t(`issues.${issue.reason}`, { name })}</span>
            <button type="button" className="link-u text-sm whitespace-nowrap" onClick={() => cart.remove(lineKey(issue.line))}>
              {t("remove", { name })}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function CartLines({ priced, onNavigate }: { priced: PricedCart; onNavigate?: () => void }) {
  const t = useTranslations("shop.cart");
  const locale = useLocale() as Locale;
  return (
    <ul className="cart-lines">
      {priced.lines.map(({ line, drink, total }) => {
        const key = lineKey(line);
        const name = drink.product.name;
        const options = drink.choices.flatMap((c) => c.options.map((o) => localize(o.name, locale))).join(" · ");
        return (
          <li key={key} className="cart-line">
            <span className="media cart-line__media">
              <Image src={productPhoto(drink.product.imageKey)} alt="" sizes="64px" className="size-full object-cover" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-forest">{name}</p>
              <p className="text-sm text-ink-soft">{options}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="qty qty--small" role="group" aria-label={t("quantity", { name })}>
                  <button type="button" aria-label={t("less", { name })} onClick={() => cart.setQuantity(key, line.quantity - 1)}>
                    <Icon name="minus" size={14} />
                  </button>
                  <output aria-live="polite">{line.quantity}</output>
                  <button
                    type="button"
                    aria-label={t("more", { name })}
                    disabled={line.quantity >= MAX_QUANTITY}
                    onClick={() => cart.setQuantity(key, line.quantity + 1)}
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </div>
                <Link
                  href={{ pathname: "/menu/[slug]", params: { slug: drink.product.slug } }}
                  className="link-u text-sm text-forest"
                  onClick={onNavigate}
                >
                  {t("edit")}
                </Link>
                <button type="button" className="cart-line__remove" onClick={() => cart.remove(key)} aria-label={t("remove", { name })}>
                  <Icon name="close" size={16} />
                </button>
              </div>
            </div>
            <p className="font-display font-semibold whitespace-nowrap text-forest">{formatMoney(total, locale)}</p>
          </li>
        );
      })}
    </ul>
  );
}
