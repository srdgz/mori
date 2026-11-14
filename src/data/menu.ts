import type { ImageMetadata } from "astro";
import classic from "../assets/photos/classic-matcha.jpg";
import strawberry from "../assets/photos/strawberry-matcha.jpg";
import vanilla from "../assets/photos/vanilla-matcha.jpg";
import coconut from "../assets/photos/coconut-matcha.jpg";
import dirty from "../assets/photos/dirty-matcha.jpg";
import mango from "../assets/photos/mango-matcha.jpg";
import type { Lang } from "../i18n/ui";

type L = Record<Lang, string>;

export interface Drink {
  id: string;
  name: string;
  image: ImageMetadata;
  price: string;
  cup: string;
  cupName: L;
  short: L;
  long: L;
  alt: L;
  tags: L[];
}

export function formatPrice(price: string, lang: Lang) {
  return lang === "en" ? `€${price.replace(" €", "").replace(",", ".")}` : price;
}

export const drinks: Drink[] = [
  {
    id: "classic",
    name: "Classic Matcha",
    image: classic,
    price: "4,50 €",
    cup: "#b6d66b",
    cupName: { es: "Vaso verde", en: "Green cup" },
    short: { es: "Matcha y leche. El de siempre, hecho como debe.", en: "Matcha and milk. The original, done right." },
    long: {
      es: "Matcha ceremonial batido a mano sobre leche fría o caliente. Sin siropes, sin distracciones: el punto de partida de todo lo demás.",
      en: "Hand-whisked ceremonial matcha over cold or steamed milk. No syrups, no distractions: the starting point for everything else.",
    },
    alt: { es: "Classic Matcha con hielo en vaso alto", en: "Iced Classic Matcha in a tall glass" },
    tags: [{ es: "Frío o caliente", en: "Iced or hot" }, { es: "Más vendido", en: "Bestseller" }],
  },
  {
    id: "strawberry",
    name: "Strawberry Matcha",
    image: strawberry,
    price: "5,40 €",
    cup: "#eba6a9",
    cupName: { es: "Vaso rosa", en: "Pink cup" },
    short: { es: "Matcha y fresa. Dulce, ácido y muy de Instagram.", en: "Matcha and strawberry. Sweet, tart and very Instagram." },
    long: {
      es: "Una base de fresa machacada, leche fría y matcha por encima. Se mezcla con la pajita y cambia de color en cada sorbo.",
      en: "Crushed strawberry at the bottom, cold milk and matcha on top. Stir it with the straw and watch it change colour with every sip.",
    },
    alt: { es: "Strawberry Matcha con capa de fresa en la base", en: "Strawberry Matcha with a strawberry layer at the bottom" },
    tags: [{ es: "Solo frío", en: "Iced only" }, { es: "Fruta natural", en: "Real fruit" }],
  },
  {
    id: "vanilla",
    name: "Vanilla Matcha",
    image: vanilla,
    price: "5,20 €",
    cup: "#eadcb4",
    cupName: { es: "Vaso vainilla", en: "Vanilla cup" },
    short: { es: "Matcha y vainilla. Suave, redondo, el favorito para empezar.", en: "Matcha and vanilla. Smooth, round, the perfect first one." },
    long: {
      es: "Vainilla de Madagascar infusionada en casa. Suaviza el punto vegetal del matcha sin taparlo. Si es tu primer matcha, empieza aquí.",
      en: "House-infused Madagascar vanilla. It softens the grassy edge of matcha without hiding it. If it's your first matcha, start here.",
    },
    alt: { es: "Vanilla Matcha con hielo", en: "Iced Vanilla Matcha" },
    tags: [{ es: "Frío o caliente", en: "Iced or hot" }, { es: "Para empezar", en: "Beginner friendly" }],
  },
  {
    id: "coconut",
    name: "Coconut Matcha",
    image: coconut,
    price: "5,40 €",
    cup: "#f7f4ec",
    cupName: { es: "Vaso blanco", en: "White cup" },
    short: { es: "Matcha y coco. Fresco, ligero, con aire de vacaciones.", en: "Matcha and coconut. Fresh, light, holiday mood." },
    long: {
      es: "Bebida de coco cremosa y matcha en capas. 100 % vegetal y con ese punto tropical que pide la tarde.",
      en: "Creamy coconut milk layered with matcha. 100% plant-based, with the tropical touch your afternoon is asking for.",
    },
    alt: { es: "Coconut Matcha con bebida de coco y matcha en capas", en: "Coconut Matcha with layered coconut milk and matcha" },
    tags: [{ es: "Vegano", en: "Vegan" }, { es: "Solo frío", en: "Iced only" }],
  },
  {
    id: "dirty",
    name: "Dirty Matcha",
    image: dirty,
    price: "5,60 €",
    cup: "#6e4b36",
    cupName: { es: "Vaso tostado", en: "Roast cup" },
    short: { es: "Matcha con espresso. Para quien no quiere elegir.", en: "Matcha with espresso. For when you can't choose." },
    long: {
      es: "Un shot de espresso de especialidad sobre nuestro Classic. Doble energía, tres capas y un final tostado.",
      en: "A shot of specialty espresso over our Classic. Double energy, three layers and a toasty finish.",
    },
    alt: { es: "Dirty Matcha con capa de espresso", en: "Dirty Matcha with an espresso layer" },
    tags: [{ es: "Con cafeína extra", en: "Extra caffeine" }, { es: "Frío o caliente", en: "Iced or hot" }],
  },
  {
    id: "mango",
    name: "Iced Mango Matcha",
    image: mango,
    price: "5,60 €",
    cup: "#f2b33d",
    cupName: { es: "Vaso mango", en: "Mango cup" },
    short: { es: "Matcha y mango. Verano en vaso, todo el año.", en: "Matcha and mango. Summer in a cup, all year round." },
    long: {
      es: "Puré de mango maduro, leche fría y matcha. El contraste de color más bonito de la carta y uno de los más pedidos.",
      en: "Ripe mango purée, cold milk and matcha. The prettiest colour contrast on the menu and one of the most ordered.",
    },
    alt: { es: "Iced Mango Matcha con capa de mango", en: "Iced Mango Matcha with a mango layer" },
    tags: [{ es: "Solo frío", en: "Iced only" }, { es: "Fruta natural", en: "Real fruit" }],
  },
];
