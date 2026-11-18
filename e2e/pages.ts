export const pages = [
  { key: "home", es: "/", en: "/en", h1: { es: /good matcha/i, en: /good matcha/i } },
  { key: "story", es: "/historia", en: "/en/story", h1: { es: /nuestra historia/i, en: /our story/i } },
  { key: "menu", es: "/carta", en: "/en/menu", h1: { es: /la carta/i, en: /the menu/i } },
  { key: "product", es: "/carta/classic-matcha", en: "/en/menu/classic-matcha", h1: { es: /classic matcha/i, en: /classic matcha/i } },
  { key: "culture", es: "/cultura-matcha", en: "/en/matcha-culture", h1: { es: /cultura matcha/i, en: /matcha culture/i } },
  { key: "findUs", es: "/donde-estamos", en: "/en/find-us", h1: { es: /dónde estamos/i, en: /find us/i } },
  { key: "contact", es: "/contacto", en: "/en/contact", h1: { es: /hablemos/i, en: /say hello/i } },
  { key: "legalNotice", es: "/aviso-legal", en: "/en/legal-notice", h1: { es: /aviso legal/i, en: /legal notice/i } },
  { key: "privacy", es: "/privacidad", en: "/en/privacy", h1: { es: /política de privacidad/i, en: /privacy policy/i } },
  { key: "cookies", es: "/cookies", en: "/en/cookies", h1: { es: /política de cookies/i, en: /cookie policy/i } },
  { key: "terms", es: "/condiciones-de-venta", en: "/en/terms-of-sale", h1: { es: /condiciones de venta/i, en: /terms of sale/i } },
] as const;

export const locales = ["es", "en"] as const;
