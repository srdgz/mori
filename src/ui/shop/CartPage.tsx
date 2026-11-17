"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/core/domain/shared/locale";
import { formatMoney } from "@/core/domain/shared/money";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/ui/primitives/Icon";
import { CartIssues, CartLines } from "./CartLines";
import { FreeDeliveryBar, useCartContext } from "./CartProvider";
import { useCart } from "./cart-store";

export function CartPage() {
  const t = useTranslations("shop.cart");
  const locale = useLocale() as Locale;
  const { ready } = useCart();
  const { priced, catalog, freeFrom } = useCartContext();

  if (ready && priced.lines.length === 0 && priced.issues.length === 0) {
    return (
      <div className="grid justify-items-start gap-3">
        <p className="font-semibold text-forest">{t("empty")}</p>
        <p className="text-ink-soft">{t("emptyText")}</p>
        <Link href="/menu" className="btn mt-2">
          {t("emptyCta")}
          <Icon name="arrow" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-[clamp(24px,4vw,56px)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="grid gap-4">
        <CartIssues priced={priced} catalog={catalog} />
        <CartLines priced={priced} />
      </div>
      <aside className="account-card grid gap-4">
        <FreeDeliveryBar priced={priced} freeFrom={freeFrom} />
        <p className="flex items-baseline justify-between">
          <span className="text-ink-soft">{t("subtotal")}</span>
          <span className="font-display text-2xl font-semibold text-forest">{formatMoney(priced.subtotal, locale)}</span>
        </p>
        <Link href="/checkout" className="btn btn--matcha w-full">
          {t("checkout")}
        </Link>
      </aside>
    </div>
  );
}
