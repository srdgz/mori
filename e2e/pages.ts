export const pages = [
  { key: "home", es: "/", en: "/en", h1: { es: /good matcha/i, en: /good matcha/i } },
  { key: "story", es: "/historia", en: "/en/story", h1: { es: /nuestra historia/i, en: /our story/i } },
  { key: "menu", es: "/carta", en: "/en/menu", h1: { es: /la carta/i, en: /the menu/i } },
  { key: "culture", es: "/cultura-matcha", en: "/en/matcha-culture", h1: { es: /cultura matcha/i, en: /matcha culture/i } },
  { key: "findUs", es: "/donde-estamos", en: "/en/find-us", h1: { es: /dónde estamos/i, en: /find us/i } },
  { key: "contact", es: "/contacto", en: "/en/contact", h1: { es: /hablemos/i, en: /say hello/i } },
] as const;

export const locales = ["es", "en"] as const;
