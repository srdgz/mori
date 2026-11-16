import type { Product, ProductId } from "@/core/domain/catalog/product";
import { money } from "@/core/domain/shared/money";

type Seed = Omit<Product, "id" | "price"> & { id: string; priceCents: number };

const seed: Seed[] = [
  {
    id: "prd_classic",
    slug: "classic-matcha",
    name: "Classic Matcha",
    imageKey: "classic",
    priceCents: 450,
    cupColor: "#b6d66b",
    cupName: {
      es: "Vaso verde",
      en: "Green cup",
    },
    shortDescription: {
      es: "Matcha y leche. El de siempre, hecho como debe.",
      en: "Matcha and milk. The original, done right.",
    },
    description: {
      es: "Matcha ceremonial batido a mano sobre leche fría o caliente. Sin siropes, sin distracciones: el punto de partida de todo lo demás.",
      en: "Hand-whisked ceremonial matcha over cold or steamed milk. No syrups, no distractions: the starting point for everything else.",
    },
    alt: {
      es: "Classic Matcha con hielo en vaso alto",
      en: "Iced Classic Matcha in a tall glass",
    },
    tags: [
      {
        es: "Frío o caliente",
        en: "Iced or hot",
      },
      {
        es: "Más vendido",
        en: "Bestseller",
      },
    ],
    isAvailable: true,
    isFeatured: true,
    sort: 1,
  },
  {
    id: "prd_strawberry",
    slug: "strawberry-matcha",
    name: "Strawberry Matcha",
    imageKey: "strawberry",
    priceCents: 540,
    cupColor: "#eba6a9",
    cupName: {
      es: "Vaso rosa",
      en: "Pink cup",
    },
    shortDescription: {
      es: "Matcha y fresa. Dulce, ácido y muy de Instagram.",
      en: "Matcha and strawberry. Sweet, tart and very Instagram.",
    },
    description: {
      es: "Una base de fresa machacada, leche fría y matcha por encima. Se mezcla con la pajita y cambia de color en cada sorbo.",
      en: "Crushed strawberry at the bottom, cold milk and matcha on top. Stir it with the straw and watch it change colour with every sip.",
    },
    alt: {
      es: "Strawberry Matcha con capa de fresa en la base",
      en: "Strawberry Matcha with a strawberry layer at the bottom",
    },
    tags: [
      {
        es: "Solo frío",
        en: "Iced only",
      },
      {
        es: "Fruta natural",
        en: "Real fruit",
      },
    ],
    isAvailable: true,
    isFeatured: true,
    sort: 2,
  },
  {
    id: "prd_vanilla",
    slug: "vanilla-matcha",
    name: "Vanilla Matcha",
    imageKey: "vanilla",
    priceCents: 520,
    cupColor: "#eadcb4",
    cupName: {
      es: "Vaso vainilla",
      en: "Vanilla cup",
    },
    shortDescription: {
      es: "Matcha y vainilla. Suave, redondo, el favorito para empezar.",
      en: "Matcha and vanilla. Smooth, round, the perfect first one.",
    },
    description: {
      es: "Vainilla de Madagascar infusionada en casa. Suaviza el punto vegetal del matcha sin taparlo. Si es tu primer matcha, empieza aquí.",
      en: "House-infused Madagascar vanilla. It softens the grassy edge of matcha without hiding it. If it's your first matcha, start here.",
    },
    alt: {
      es: "Vanilla Matcha con hielo",
      en: "Iced Vanilla Matcha",
    },
    tags: [
      {
        es: "Frío o caliente",
        en: "Iced or hot",
      },
      {
        es: "Para empezar",
        en: "Beginner friendly",
      },
    ],
    isAvailable: true,
    isFeatured: true,
    sort: 3,
  },
  {
    id: "prd_coconut",
    slug: "coconut-matcha",
    name: "Coconut Matcha",
    imageKey: "coconut",
    priceCents: 540,
    cupColor: "#f7f4ec",
    cupName: {
      es: "Vaso blanco",
      en: "White cup",
    },
    shortDescription: {
      es: "Matcha y coco. Fresco, ligero, con aire de vacaciones.",
      en: "Matcha and coconut. Fresh, light, holiday mood.",
    },
    description: {
      es: "Bebida de coco cremosa y matcha en capas. 100 % vegetal y con ese punto tropical que pide la tarde.",
      en: "Creamy coconut milk layered with matcha. 100% plant-based, with the tropical touch your afternoon is asking for.",
    },
    alt: {
      es: "Coconut Matcha con bebida de coco y matcha en capas",
      en: "Coconut Matcha with layered coconut milk and matcha",
    },
    tags: [
      {
        es: "Vegano",
        en: "Vegan",
      },
      {
        es: "Solo frío",
        en: "Iced only",
      },
    ],
    isAvailable: true,
    isFeatured: true,
    sort: 4,
  },
  {
    id: "prd_dirty",
    slug: "dirty-matcha",
    name: "Dirty Matcha",
    imageKey: "dirty",
    priceCents: 560,
    cupColor: "#6e4b36",
    cupName: {
      es: "Vaso tostado",
      en: "Roast cup",
    },
    shortDescription: {
      es: "Matcha con espresso. Para quien no quiere elegir.",
      en: "Matcha with espresso. For when you can't choose.",
    },
    description: {
      es: "Un shot de espresso de especialidad sobre nuestro Classic. Doble energía, tres capas y un final tostado.",
      en: "A shot of specialty espresso over our Classic. Double energy, three layers and a toasty finish.",
    },
    alt: {
      es: "Dirty Matcha con capa de espresso",
      en: "Dirty Matcha with an espresso layer",
    },
    tags: [
      {
        es: "Con cafeína extra",
        en: "Extra caffeine",
      },
      {
        es: "Frío o caliente",
        en: "Iced or hot",
      },
    ],
    isAvailable: true,
    isFeatured: true,
    sort: 5,
  },
  {
    id: "prd_mango",
    slug: "iced-mango-matcha",
    name: "Iced Mango Matcha",
    imageKey: "mango",
    priceCents: 560,
    cupColor: "#f2b33d",
    cupName: {
      es: "Vaso mango",
      en: "Mango cup",
    },
    shortDescription: {
      es: "Matcha y mango. Verano en vaso, todo el año.",
      en: "Matcha and mango. Summer in a cup, all year round.",
    },
    description: {
      es: "Puré de mango maduro, leche fría y matcha. El contraste de color más bonito de la carta y uno de los más pedidos.",
      en: "Ripe mango purée, cold milk and matcha. The prettiest colour contrast on the menu and one of the most ordered.",
    },
    alt: {
      es: "Iced Mango Matcha con capa de mango",
      en: "Iced Mango Matcha with a mango layer",
    },
    tags: [
      {
        es: "Solo frío",
        en: "Iced only",
      },
      {
        es: "Fruta natural",
        en: "Real fruit",
      },
    ],
    isAvailable: true,
    isFeatured: true,
    sort: 6,
  },
];

export const catalogSeed: readonly Product[] = seed.map(({ id, priceCents, ...rest }) => ({
  ...rest,
  id: id as ProductId,
  price: money(priceCents),
}));
