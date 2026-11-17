import { defineRouting } from "next-intl/routing";

export const locales = ["es", "en"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "es",
  localePrefix: "as-needed",
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/story": { es: "/historia", en: "/story" },
    "/menu": { es: "/carta", en: "/menu" },
    "/menu/[slug]": { es: "/carta/[slug]", en: "/menu/[slug]" },
    "/culture": { es: "/cultura-matcha", en: "/matcha-culture" },
    "/find-us": { es: "/donde-estamos", en: "/find-us" },
    "/contact": { es: "/contacto", en: "/contact" },
    "/cart": { es: "/carrito", en: "/cart" },
    "/checkout": { es: "/checkout", en: "/checkout" },
    "/order/[code]": { es: "/pedido/[code]", en: "/order/[code]" },
    "/account/sign-in": { es: "/cuenta/entrar", en: "/account/sign-in" },
    "/account/sign-up": { es: "/cuenta/registro", en: "/account/sign-up" },
    "/account/forgot-password": { es: "/cuenta/recuperar", en: "/account/forgot-password" },
    "/account/reset-password": { es: "/cuenta/nueva-contrasena", en: "/account/reset-password" },
    "/account": { es: "/cuenta", en: "/account" },
    "/account/orders": { es: "/cuenta/pedidos", en: "/account/orders" },
    "/account/orders/[code]": { es: "/cuenta/pedidos/[code]", en: "/account/orders/[code]" },
    "/account/profile": { es: "/cuenta/perfil", en: "/account/profile" },
    "/account/addresses": { es: "/cuenta/direcciones", en: "/account/addresses" },
    "/account/favourites": { es: "/cuenta/favoritos", en: "/account/favourites" },
    "/account/security": { es: "/cuenta/seguridad", en: "/account/security" },
  },
});

export type AppPathname = keyof typeof routing.pathnames;

export type StaticPathname = Exclude<AppPathname, `${string}[${string}`>;

export const publicAccountPathnames = [
  "/account/sign-in",
  "/account/sign-up",
  "/account/forgot-password",
  "/account/reset-password",
] as const satisfies readonly AppPathname[];

export const privatePathnames = Object.keys(routing.pathnames).filter(
  (p) => p.startsWith("/account") && !(publicAccountPathnames as readonly string[]).includes(p),
) as AppPathname[];

export const staticPathnames = Object.keys(routing.pathnames).filter((p) => !p.includes("[")) as StaticPathname[];

export const indexablePathnames = staticPathnames.filter((p) => !p.startsWith("/account") && p !== "/cart" && p !== "/checkout");

export const navItems = [
  { href: "/story", key: "story" },
  { href: "/menu", key: "menu" },
  { href: "/culture", key: "culture" },
  { href: "/find-us", key: "findUs" },
  { href: "/contact", key: "contact" },
] as const satisfies ReadonlyArray<{ href: AppPathname; key: string }>;
