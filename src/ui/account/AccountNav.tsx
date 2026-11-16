"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cx } from "@/ui/primitives/cx";

const items = [
  { href: "/account", key: "overview" },
  { href: "/account/profile", key: "profile" },
  { href: "/account/addresses", key: "addresses" },
  { href: "/account/favourites", key: "favourites" },
  { href: "/account/security", key: "security" },
] as const;

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
              className={cx("account-nav__link", pathname === item.href && "is-current")}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {t(item.key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
