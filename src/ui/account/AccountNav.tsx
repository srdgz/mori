"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cx } from "@/ui/primitives/cx";

const items = [
  { href: "/account", key: "overview" },
  { href: "/account/orders", key: "orders" },
  { href: "/account/profile", key: "profile" },
  { href: "/account/addresses", key: "addresses" },
  { href: "/account/favourites", key: "favourites" },
  { href: "/account/security", key: "security" },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/account" && pathname.startsWith(`${href}/`));
}

export function AccountNav() {
  const t = useTranslations("account.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="account-nav">
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cx("account-nav__link", isCurrent(pathname, item.href) && "is-current")}
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
            >
              {t(item.key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
