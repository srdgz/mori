"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cx } from "@/ui/primitives/cx";

const items = [
  { href: "/admin", key: "dashboard", adminOnly: true },
  { href: "/admin/orders", key: "orders", adminOnly: false },
  { href: "/admin/products", key: "products", adminOnly: true },
  { href: "/admin/coupons", key: "coupons", adminOnly: true },
  { href: "/admin/reviews", key: "reviews", adminOnly: false },
  { href: "/admin/customers", key: "customers", adminOnly: true },
  { href: "/admin/settings", key: "settings", adminOnly: true },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="account-nav admin-nav">
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            {item.adminOnly && !isAdmin ? (
              <span className="account-nav__link is-disabled" aria-disabled="true">
                {t(item.key)}
                <span className="admin-nav__hint">{t("adminOnly")}</span>
              </span>
            ) : (
              <Link
                href={item.href}
                className={cx("account-nav__link", isCurrent(pathname, item.href) && "is-current")}
                aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
              >
                {t(item.key)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
