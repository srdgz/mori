export const languages = { es: "Español", en: "English" } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = "es";

export const routes = [
  { key: "home", path: { es: "", en: "" }, label: { es: "Inicio", en: "Home" } },
  { key: "story", path: { es: "historia", en: "story" }, label: { es: "Nuestra historia", en: "Our Story" } },
  { key: "menu", path: { es: "carta", en: "menu" }, label: { es: "La carta", en: "The Menu" } },
  { key: "culture", path: { es: "cultura-matcha", en: "matcha-culture" }, label: { es: "Cultura matcha", en: "Matcha Culture" } },
  { key: "findus", path: { es: "donde-estamos", en: "find-us" }, label: { es: "Dónde estamos", en: "Find Us" } },
  { key: "contact", path: { es: "contacto", en: "contact" }, label: { es: "Contacto", en: "Contact" } },
] as const;

export type RouteKey = (typeof routes)[number]["key"];

export function href(lang: Lang, key: RouteKey): string {
  const route = routes.find((r) => r.key === key)!;
  const base = lang === defaultLang ? "/" : `/${lang}/`;
  const path = route.path[lang];
  return path ? `${base}${path}/` : base;
}

export function label(lang: Lang, key: RouteKey): string {
  return routes.find((r) => r.key === key)!.label[lang];
}

export const brand = {
  address: "C/ Espíritu Santo, 18",
  city: "28004 Madrid",
  email: "hola@morimatchabar.com",
  phone: "+34 910 000 000",
  instagram: "@mori.matchabar",
  hours: { weekday: ["08:00", "20:00"], weekend: ["09:30", "20:30"] },
};

const ui = {
  es: {
    skip: "Saltar al contenido",
    navLabel: "Navegación principal",
    langLabel: "Idioma",
    menuOpen: "Abrir menú",
    menuClose: "Cerrar menú",
    home: "MŌRI, inicio",
    footClaim: 'Tu nueva <span class="text-matcha">pausa favorita.</span>',
    footVisit: "Visítanos",
    footHours: "Horario",
    footExplore: "Explora",
    footFollow: "Síguenos",
    weekdays: "Lunes a viernes",
    weekend: "Sábado y domingo",
    weekdaysShort: "L–V",
    weekendShort: "S–D",
    metro: "Metro Tribunal (L1, L10)",
    note: "Marca ficticia · Proyecto de portfolio",
    openUntil: "Abierto ahora · hasta las",
    closedOpensAt: "Cerrado ahora · abrimos a las",
    closedTomorrow: "Cerrado ahora · volvemos mañana",
    pauseMarquee: "Pausar animación",
    playMarquee: "Reanudar animación",
    prev: "Anterior",
    next: "Siguiente",
    discoverMenu: "Descubre la carta",
    notFound: "Esta página se ha ido a por un matcha.",
    backHome: "Volver al inicio",
    newTab: "(abre en una pestaña nueva)",
  },
  en: {
    skip: "Skip to content",
    navLabel: "Main navigation",
    langLabel: "Language",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    home: "MŌRI, home",
    footClaim: 'Your new <span class="text-matcha">favourite break.</span>',
    footVisit: "Visit us",
    footHours: "Opening hours",
    footExplore: "Explore",
    footFollow: "Follow us",
    weekdays: "Monday to Friday",
    weekend: "Saturday & Sunday",
    weekdaysShort: "Mon–Fri",
    weekendShort: "Sat–Sun",
    metro: "Tribunal metro (L1, L10)",
    note: "Fictional brand · Portfolio project",
    openUntil: "Open now · until",
    closedOpensAt: "Closed now · we open at",
    closedTomorrow: "Closed now · back tomorrow",
    pauseMarquee: "Pause animation",
    playMarquee: "Resume animation",
    prev: "Previous",
    next: "Next",
    discoverMenu: "Explore the menu",
    notFound: "This page popped out for a matcha.",
    backHome: "Back to home",
    newTab: "(opens in a new tab)",
  },
} as const;

export type UIKey = keyof (typeof ui)["es"];

export function useT(lang: Lang) {
  return (key: UIKey) => ui[lang][key];
}
