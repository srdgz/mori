import type { Option, OptionGroup, OptionGroupId, OptionId } from "@/core/domain/catalog/options";
import type { Product, ProductId } from "@/core/domain/catalog/product";
import type { LocalizedText } from "@/core/domain/shared/locale";
import { money } from "@/core/domain/shared/money";

export type CategorySeed = { id: string; slug: string; name: LocalizedText; sort: number };

export type OptionSeed = { id: string; code: string; name: LocalizedText; priceDeltaCents: number; sort: number };

export type OptionGroupSeed = {
  id: string;
  code: string;
  name: LocalizedText;
  selection: "single" | "multiple";
  required: boolean;
  sort: number;
  options: OptionSeed[];
};

export type ProductGroupSeed = { code: string; defaultOption?: string; allowed?: string[] };

export type ProductSeed = {
  id: string;
  slug: string;
  categoryId: string;
  name: string;
  image: string;
  priceCents: number;
  cupColor: string;
  cupName: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  alt: LocalizedText;
  tags: LocalizedText[];
  isVegan: boolean;
  isFeatured: boolean;
  sort: number;
  groups: ProductGroupSeed[];
};

export const categorySeed: CategorySeed[] = [
  { id: "40000000-0000-4000-8000-000000000001", slug: "signature", name: { es: "Signature", en: "Signature" }, sort: 1 },
];

export const optionGroupSeed: OptionGroupSeed[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    code: "size",
    name: { es: "Tamaño", en: "Size" },
    selection: "single",
    required: true,
    sort: 1,
    options: [
      {
        id: "30000000-0000-4000-8000-000000000101",
        code: "regular",
        name: { es: "Normal · 350 ml", en: "Regular · 350 ml" },
        priceDeltaCents: 0,
        sort: 1,
      },
      {
        id: "30000000-0000-4000-8000-000000000102",
        code: "large",
        name: { es: "Grande · 470 ml", en: "Large · 470 ml" },
        priceDeltaCents: 90,
        sort: 2,
      },
    ],
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    code: "temperature",
    name: { es: "Temperatura", en: "Temperature" },
    selection: "single",
    required: true,
    sort: 2,
    options: [
      { id: "30000000-0000-4000-8000-000000000201", code: "iced", name: { es: "Frío", en: "Iced" }, priceDeltaCents: 0, sort: 1 },
      { id: "30000000-0000-4000-8000-000000000202", code: "hot", name: { es: "Caliente", en: "Hot" }, priceDeltaCents: 0, sort: 2 },
    ],
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    code: "milk",
    name: { es: "Bebida base", en: "Milk" },
    selection: "single",
    required: true,
    sort: 3,
    options: [
      {
        id: "30000000-0000-4000-8000-000000000301",
        code: "whole",
        name: { es: "Leche entera", en: "Whole milk" },
        priceDeltaCents: 0,
        sort: 1,
      },
      { id: "30000000-0000-4000-8000-000000000302", code: "oat", name: { es: "Avena", en: "Oat" }, priceDeltaCents: 40, sort: 2 },
      { id: "30000000-0000-4000-8000-000000000303", code: "almond", name: { es: "Almendra", en: "Almond" }, priceDeltaCents: 40, sort: 3 },
      { id: "30000000-0000-4000-8000-000000000304", code: "coconut", name: { es: "Coco", en: "Coconut" }, priceDeltaCents: 40, sort: 4 },
      { id: "30000000-0000-4000-8000-000000000305", code: "soy", name: { es: "Soja", en: "Soy" }, priceDeltaCents: 40, sort: 5 },
    ],
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    code: "sweetness",
    name: { es: "Dulzor", en: "Sweetness" },
    selection: "single",
    required: true,
    sort: 4,
    options: [
      { id: "30000000-0000-4000-8000-000000000401", code: "none", name: { es: "Sin azúcar", en: "No sugar" }, priceDeltaCents: 0, sort: 1 },
      {
        id: "30000000-0000-4000-8000-000000000402",
        code: "light",
        name: { es: "Poco dulce", en: "Lightly sweet" },
        priceDeltaCents: 0,
        sort: 2,
      },
      { id: "30000000-0000-4000-8000-000000000403", code: "regular", name: { es: "Normal", en: "Regular" }, priceDeltaCents: 0, sort: 3 },
    ],
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    code: "extras",
    name: { es: "Extras", en: "Extras" },
    selection: "multiple",
    required: false,
    sort: 5,
    options: [
      {
        id: "30000000-0000-4000-8000-000000000501",
        code: "matcha-shot",
        name: { es: "Shot extra de matcha", en: "Extra matcha shot" },
        priceDeltaCents: 100,
        sort: 1,
      },
      {
        id: "30000000-0000-4000-8000-000000000502",
        code: "cold-foam",
        name: { es: "Espuma fría", en: "Cold foam" },
        priceDeltaCents: 80,
        sort: 2,
      },
      {
        id: "30000000-0000-4000-8000-000000000503",
        code: "vanilla-syrup",
        name: { es: "Sirope de vainilla casero", en: "House vanilla syrup" },
        priceDeltaCents: 50,
        sort: 3,
      },
    ],
  },
];

const size: ProductGroupSeed = { code: "size", defaultOption: "regular" };
const icedOrHot: ProductGroupSeed = { code: "temperature", defaultOption: "iced" };
const icedOnly: ProductGroupSeed = { code: "temperature", defaultOption: "iced", allowed: ["iced"] };
const milk: ProductGroupSeed = { code: "milk", defaultOption: "whole" };
const sweetness: ProductGroupSeed = { code: "sweetness", defaultOption: "regular" };
const extras: ProductGroupSeed = { code: "extras" };

const signature = "40000000-0000-4000-8000-000000000001";

export const productSeed: ProductSeed[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "classic-matcha",
    categoryId: signature,
    name: "Classic Matcha",
    image: "classic",
    priceCents: 450,
    cupColor: "#b6d66b",
    cupName: { es: "Vaso verde", en: "Green cup" },
    shortDescription: {
      es: "Matcha y leche. El de siempre, hecho como debe.",
      en: "Matcha and milk. The original, done right.",
    },
    description: {
      es: "Matcha ceremonial batido a mano sobre leche fría o caliente. Sin siropes, sin distracciones: el punto de partida de todo lo demás.",
      en: "Hand-whisked ceremonial matcha over cold or steamed milk. No syrups, no distractions: the starting point for everything else.",
    },
    alt: { es: "Classic Matcha con hielo en vaso alto", en: "Iced Classic Matcha in a tall glass" },
    tags: [
      { es: "Frío o caliente", en: "Iced or hot" },
      { es: "Más vendido", en: "Bestseller" },
    ],
    isVegan: false,
    isFeatured: true,
    sort: 1,
    groups: [size, icedOrHot, milk, sweetness, extras],
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "strawberry-matcha",
    categoryId: signature,
    name: "Strawberry Matcha",
    image: "strawberry",
    priceCents: 540,
    cupColor: "#eba6a9",
    cupName: { es: "Vaso rosa", en: "Pink cup" },
    shortDescription: {
      es: "Matcha y fresa. Dulce, ácido y muy de Instagram.",
      en: "Matcha and strawberry. Sweet, tart and very Instagram.",
    },
    description: {
      es: "Una base de fresa machacada, leche fría y matcha por encima. Se mezcla con la pajita y cambia de color en cada sorbo.",
      en: "Crushed strawberry at the bottom, cold milk and matcha on top. Stir it with the straw and watch it change colour with every sip.",
    },
    alt: { es: "Strawberry Matcha con capa de fresa en la base", en: "Strawberry Matcha with a strawberry layer at the bottom" },
    tags: [
      { es: "Solo frío", en: "Iced only" },
      { es: "Fruta natural", en: "Real fruit" },
    ],
    isVegan: false,
    isFeatured: true,
    sort: 2,
    groups: [size, icedOnly, milk, sweetness, extras],
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    slug: "vanilla-matcha",
    categoryId: signature,
    name: "Vanilla Matcha",
    image: "vanilla",
    priceCents: 520,
    cupColor: "#eadcb4",
    cupName: { es: "Vaso vainilla", en: "Vanilla cup" },
    shortDescription: {
      es: "Matcha y vainilla. Suave, redondo, el favorito para empezar.",
      en: "Matcha and vanilla. Smooth, round, the perfect first one.",
    },
    description: {
      es: "Vainilla de Madagascar infusionada en casa. Suaviza el punto vegetal del matcha sin taparlo. Si es tu primer matcha, empieza aquí.",
      en: "House-infused Madagascar vanilla. It softens the grassy edge of matcha without hiding it. If it's your first matcha, start here.",
    },
    alt: { es: "Vanilla Matcha con hielo", en: "Iced Vanilla Matcha" },
    tags: [
      { es: "Frío o caliente", en: "Iced or hot" },
      { es: "Para empezar", en: "Beginner friendly" },
    ],
    isVegan: false,
    isFeatured: true,
    sort: 3,
    groups: [size, icedOrHot, milk, sweetness, { code: "extras", allowed: ["matcha-shot", "cold-foam"] }],
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    slug: "coconut-matcha",
    categoryId: signature,
    name: "Coconut Matcha",
    image: "coconut",
    priceCents: 540,
    cupColor: "#f7f4ec",
    cupName: { es: "Vaso blanco", en: "White cup" },
    shortDescription: {
      es: "Matcha y coco. Fresco, ligero, con aire de vacaciones.",
      en: "Matcha and coconut. Fresh, light, holiday mood.",
    },
    description: {
      es: "Bebida de coco cremosa y matcha en capas. 100 % vegetal y con ese punto tropical que pide la tarde.",
      en: "Creamy coconut milk layered with matcha. 100% plant-based, with the tropical touch your afternoon is asking for.",
    },
    alt: { es: "Coconut Matcha con bebida de coco y matcha en capas", en: "Coconut Matcha with layered coconut milk and matcha" },
    tags: [
      { es: "Vegano", en: "Vegan" },
      { es: "Solo frío", en: "Iced only" },
    ],
    isVegan: true,
    isFeatured: true,
    sort: 4,
    groups: [size, icedOnly, sweetness, { code: "extras", allowed: ["matcha-shot", "vanilla-syrup"] }],
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    slug: "dirty-matcha",
    categoryId: signature,
    name: "Dirty Matcha",
    image: "dirty",
    priceCents: 560,
    cupColor: "#6e4b36",
    cupName: { es: "Vaso tostado", en: "Roast cup" },
    shortDescription: {
      es: "Matcha con espresso. Para quien no quiere elegir.",
      en: "Matcha with espresso. For when you can't choose.",
    },
    description: {
      es: "Un shot de espresso de especialidad sobre nuestro Classic. Doble energía, tres capas y un final tostado.",
      en: "A shot of specialty espresso over our Classic. Double energy, three layers and a toasty finish.",
    },
    alt: { es: "Dirty Matcha con capa de espresso", en: "Dirty Matcha with an espresso layer" },
    tags: [
      { es: "Con cafeína extra", en: "Extra caffeine" },
      { es: "Frío o caliente", en: "Iced or hot" },
    ],
    isVegan: false,
    isFeatured: true,
    sort: 5,
    groups: [size, icedOrHot, milk, sweetness, extras],
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    slug: "iced-mango-matcha",
    categoryId: signature,
    name: "Iced Mango Matcha",
    image: "mango",
    priceCents: 560,
    cupColor: "#f2b33d",
    cupName: { es: "Vaso mango", en: "Mango cup" },
    shortDescription: {
      es: "Matcha y mango. Verano en vaso, todo el año.",
      en: "Matcha and mango. Summer in a cup, all year round.",
    },
    description: {
      es: "Puré de mango maduro, leche fría y matcha. El contraste de color más bonito de la carta y uno de los más pedidos.",
      en: "Ripe mango purée, cold milk and matcha. The prettiest colour contrast on the menu and one of the most ordered.",
    },
    alt: { es: "Iced Mango Matcha con capa de mango", en: "Iced Mango Matcha with a mango layer" },
    tags: [
      { es: "Solo frío", en: "Iced only" },
      { es: "Fruta natural", en: "Real fruit" },
    ],
    isVegan: false,
    isFeatured: true,
    sort: 6,
    groups: [size, icedOnly, milk, sweetness, extras],
  },
];

function groupSeed(code: string): OptionGroupSeed {
  const group = optionGroupSeed.find((g) => g.code === code);
  if (!group) throw new Error(`Unknown option group ${code}`);
  return group;
}

function optionId(group: OptionGroupSeed, code: string): string {
  const option = group.options.find((o) => o.code === code);
  if (!option) throw new Error(`Unknown option ${group.code}.${code}`);
  return option.id;
}

export function productGroupIds(seed: ProductGroupSeed): {
  groupId: string;
  defaultOptionId: string | null;
  allowedOptionIds: string[] | null;
} {
  const group = groupSeed(seed.code);
  return {
    groupId: group.id,
    defaultOptionId: seed.defaultOption ? optionId(group, seed.defaultOption) : null,
    allowedOptionIds: seed.allowed ? seed.allowed.map((code) => optionId(group, code)) : null,
  };
}

function toOption(seed: OptionSeed): Option {
  return {
    id: seed.id as OptionId,
    code: seed.code,
    name: seed.name,
    priceDelta: money(seed.priceDeltaCents),
    isAvailable: true,
    sort: seed.sort,
  };
}

function toGroup(seed: ProductGroupSeed): OptionGroup {
  const group = groupSeed(seed.code);
  const ids = productGroupIds(seed);
  const options = group.options.filter((o) => ids.allowedOptionIds === null || ids.allowedOptionIds.includes(o.id)).map(toOption);
  return {
    id: group.id as OptionGroupId,
    code: group.code,
    name: group.name,
    selection: group.selection,
    required: group.required,
    sort: group.sort,
    options,
    defaultOptionId: ids.defaultOptionId as OptionId | null,
  };
}

export const catalogSeed: readonly Product[] = productSeed.map((seed) => ({
  id: seed.id as ProductId,
  slug: seed.slug,
  name: seed.name,
  imageKey: seed.image,
  price: money(seed.priceCents),
  cupColor: seed.cupColor,
  cupName: seed.cupName,
  shortDescription: seed.shortDescription,
  description: seed.description,
  alt: seed.alt,
  tags: seed.tags,
  isVegan: seed.isVegan,
  isAvailable: true,
  isFeatured: seed.isFeatured,
  sort: seed.sort,
  optionGroups: seed.groups.map(toGroup),
}));
