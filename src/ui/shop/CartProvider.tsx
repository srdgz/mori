"use client";

import { useLocale, useTranslations } from "next-intl";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { priceCart, rebaseCart, type Cart, type PricedCart } from "@/core/domain/cart/cart";
import type { Product } from "@/core/domain/catalog/product";
import { freeDeliveryProgress } from "@/core/domain/fulfilment/delivery";
import type { Locale } from "@/core/domain/shared/locale";
import { formatMoney, type Money } from "@/core/domain/shared/money";
import { Link, usePathname } from "@/i18n/navigation";
import { Icon } from "@/ui/primitives/Icon";
import { CartIssues, CartLines } from "./CartLines";
import { cart, useCart } from "./cart-store";

type SyncCart = (lines: Cart, owner: string | null) => Promise<{ owner: string; lines: Cart } | null>;

const OWNER_KEY = "mori-cart-owner";

function readOwner(): string | null {
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(owner: string) {
  try {
    window.localStorage.setItem(OWNER_KEY, owner);
  } catch {}
}

type CartContextValue = { catalog: readonly Product[]; freeFrom: Money; priced: PricedCart };

const CartContext = createContext<CartContextValue | null>(null);

export function useCartContext(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCartContext must be used inside CartProvider");
  return value;
}

export function FreeDeliveryBar({ priced, freeFrom }: { priced: PricedCart; freeFrom: Money }) {
  const t = useTranslations("shop.cart");
  const locale = useLocale() as Locale;
  const { missing, ratio } = freeDeliveryProgress(priced.subtotal, { freeFrom });
  return (
    <div className="grid gap-2">
      <p className="text-sm text-ink-soft">
        {missing.cents > 0 ? t("freeDelivery", { amount: formatMoney(missing, locale) }) : t("freeReached")}
      </p>
      <div className="progress" aria-hidden="true">
        <i style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}

function CartDrawer({ priced, catalog, freeFrom }: { priced: PricedCart; catalog: readonly Product[]; freeFrom: Money }) {
  const t = useTranslations("shop.cart");
  const locale = useLocale() as Locale;
  const { open, announcement } = useCart();
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  useEffect(() => {
    cart.close();
  }, [pathname]);

  return (
    <dialog ref={dialog} className="cart-drawer" aria-labelledby="cart-title" onClose={() => cart.close()} onCancel={() => cart.close()}>
      <div className="cart-drawer__panel">
        <header className="flex items-center justify-between gap-4">
          <h2 id="cart-title" className="h-md text-forest">
            {t("title")}
          </h2>
          <button type="button" className="cart-drawer__close" onClick={() => cart.close()} aria-label={t("close")}>
            <Icon name="close" size={20} />
          </button>
        </header>
        <p role="status" className="sr-only">
          {announcement}
        </p>

        {priced.lines.length === 0 && priced.issues.length === 0 ? (
          <div className="grid justify-items-start gap-3 py-6">
            <p className="font-semibold text-forest">{t("empty")}</p>
            <p className="text-ink-soft">{t("emptyText")}</p>
            <Link href="/menu" className="btn mt-2" onClick={() => cart.close()}>
              {t("emptyCta")}
              <Icon name="arrow" />
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-drawer__body">
              <CartIssues priced={priced} catalog={catalog} />
              <CartLines priced={priced} onNavigate={() => cart.close()} />
            </div>
            <footer className="cart-drawer__footer">
              <FreeDeliveryBar priced={priced} freeFrom={freeFrom} />
              <p className="flex items-baseline justify-between">
                <span className="text-ink-soft">{t("subtotal")}</span>
                <span className="font-display text-xl font-semibold text-forest">{formatMoney(priced.subtotal, locale)}</span>
              </p>
              <Link href="/checkout" className="btn btn--matcha w-full" onClick={() => cart.close()}>
                {t("checkout")}
              </Link>
              <Link href="/cart" className="link-u mx-auto text-sm text-forest" onClick={() => cart.close()}>
                {t("viewCart")}
              </Link>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}

type ProviderProps = { catalog: readonly Product[]; freeFrom: Money; sync: SyncCart; children: ReactNode };

export function CartProvider({ catalog, freeFrom, sync, children }: ProviderProps) {
  const { lines } = useCart();
  const owner = useRef<string | null>(null);
  const priced = useMemo(() => priceCart(lines, catalog), [lines, catalog]);

  useEffect(() => {
    cart.hydrate();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sent = cart.snapshot();
    sync(sent, readOwner())
      .then((synced) => {
        if (!synced) return;
        owner.current = synced.owner;
        writeOwner(synced.owner);
        cart.replace(rebaseCart(sent, cart.snapshot(), synced.lines));
      })
      .catch(() => undefined);
    const stop = cart.onChange((next) => {
      if (!owner.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => void sync(next, owner.current).catch(() => undefined), 600);
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, [sync]);

  return (
    <CartContext.Provider value={{ catalog, freeFrom, priced }}>
      {children}
      <CartDrawer priced={priced} catalog={catalog} freeFrom={freeFrom} />
    </CartContext.Provider>
  );
}

export function CartButton() {
  const t = useTranslations("shop.cart");
  const { ready } = useCart();
  const context = useContext(CartContext);
  const count = ready && context ? context.priced.items : 0;
  return (
    <button
      type="button"
      className="account-link cart-button relative z-10 grid size-11 place-items-center rounded-full"
      onClick={() => cart.open()}
    >
      <Icon name="bag" size={20} />
      {count > 0 && (
        <span className="cart-button__count" aria-hidden="true">
          {count}
        </span>
      )}
      <span className="sr-only">{t("open", { count })}</span>
    </button>
  );
}
