"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { navItems, routing } from "@/i18n/routing";
import { cx } from "@/ui/primitives/cx";
import { Icon } from "@/ui/primitives/Icon";
import { Mark, Wordmark } from "./Mark";

const HIDE_THRESHOLD = 64;

type Props = { address: string; instagram: string };

export function Header({ address, instagram }: Props) {
  const t = useTranslations("common");
  const nav = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const here = (pathname.includes("[") ? { pathname, params } : pathname) as ComponentProps<typeof Link>["href"];
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let travel = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      lastY = y;
      setScrolled(y > 24);
      const header = headerRef.current;
      if (y < 120 || document.documentElement.classList.contains("menu-open") || header?.contains(document.activeElement)) {
        travel = 0;
        setHidden(false);
        return;
      }
      if (delta === 0) return;
      if (Math.sign(delta) !== Math.sign(travel)) travel = 0;
      travel += delta;
      if (travel > HIDE_THRESHOLD) setHidden(true);
      else if (travel < -HIDE_THRESHOLD) setHidden(false);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [entered, setEntered] = useState(false);

  const setMenu = useCallback((value: boolean, restoreFocus = true) => {
    setOpen(value);
    document.documentElement.classList.toggle("menu-open", value);
    document.querySelectorAll<HTMLElement>("main, footer").forEach((el) => (el.inert = value));
    document.dispatchEvent(new CustomEvent("mori:menu", { detail: value }));
    if (value) {
      setMenuMounted(true);
      return;
    }
    setEntered(false);
    if (restoreFocus) burgerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
      if (e.key !== "Tab") return;
      const focusables = [
        burgerRef.current,
        ...Array.from(menuRef.current?.querySelectorAll<HTMLElement>("a") ?? []),
        ...Array.from(headerRef.current?.querySelectorAll<HTMLElement>(".lang a") ?? []),
      ].filter((el): el is HTMLElement => !!el);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (!focusables.includes(document.activeElement as HTMLElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onDesktop = (e: MediaQueryListEvent) => e.matches && setMenu(false, false);
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open, setMenu]);

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => setMenuMounted(false), 700);
    return () => window.clearTimeout(timer);
  }, [open]);

  const headerClass = ["site-header fixed inset-x-0 top-0 z-50 h-[var(--nav-h)]", scrolled && "is-scrolled", hidden && !open && "is-hidden"]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header ref={headerRef} className={headerClass} onFocus={() => setHidden(false)}>
        <div className="wrap flex h-full items-center justify-between gap-6">
          <Link href="/" className="brand relative z-10 inline-flex items-center gap-3 text-forest">
            <Mark className="size-9" />
            <Wordmark className="h-5 w-auto" />
            <span className="sr-only">{t("home")}</span>
          </Link>
          <div className="flex items-center gap-4 lg:gap-8">
            <nav aria-label={t("navLabel")} className="hidden lg:block">
              <ul className="flex gap-7">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="nav-link relative py-1.5 text-[.92rem] font-medium"
                      aria-current={pathname === item.href ? "page" : undefined}
                    >
                      {nav(item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div
              className="lang relative z-10 inline-flex rounded-full p-[3px] text-xs font-semibold tracking-[.08em]"
              role="group"
              aria-label={t("langLabel")}
            >
              {routing.locales.map((l) => (
                <Link
                  key={l}
                  href={here}
                  locale={l}
                  hrefLang={l}
                  lang={l}
                  className="rounded-full px-2.5 py-1.5"
                  aria-current={locale === l ? "true" : undefined}
                >
                  <span className="sr-only">{l === "es" ? "Español" : "English"}</span>
                  <span aria-hidden="true">{l.toUpperCase()}</span>
                </Link>
              ))}
            </div>
            <Link href="/account" className="account-link relative z-10 grid size-11 place-items-center rounded-full">
              <Icon name="user" size={20} />
              <span className="sr-only">{t("account")}</span>
            </Link>
            <button
              ref={burgerRef}
              type="button"
              className="burger relative z-10 size-11 rounded-full bg-forest lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setMenu(!open)}
            >
              <span className="sr-only">{open ? t("menuClose") : t("menuOpen")}</span>
              <span className="burger__bar top-[18px]" aria-hidden="true" />
              <span className="burger__bar top-[25px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        ref={menuRef}
        className={cx(
          "mobile-menu fixed inset-0 z-40 flex flex-col justify-between bg-forest px-[var(--gutter)] pt-[calc(var(--nav-h)+32px)] pb-8 text-cream lg:hidden",
          entered && "is-open",
        )}
        hidden={!open && !menuMounted}
      >
        <nav aria-label={t("navLabel")}>
          <ol className="m-0 list-none p-0">
            {[{ href: "/" as const, key: "home" as const }, ...navItems].map((item, i) => (
              <li key={item.href} className="border-b border-line-light">
                <Link
                  href={item.href}
                  onClick={() => setMenu(false, false)}
                  className="flex items-baseline justify-between gap-3 py-2.5 font-display text-[clamp(2rem,9vw,3.2rem)] font-semibold tracking-tight"
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {nav(item.key)}
                  <span className="font-sans text-sm tracking-widest text-matcha" aria-hidden="true">
                    0{i + 1}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex flex-col gap-2 text-sm text-sage xs:flex-row xs:justify-between">
          <span>{address} · Madrid</span>
          <span>{instagram}</span>
        </div>
      </div>
    </>
  );
}
