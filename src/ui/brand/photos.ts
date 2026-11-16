import type { StaticImageData } from "next/image";
import classic from "@/assets/photos/classic-matcha.jpg";
import coconut from "@/assets/photos/coconut-matcha.jpg";
import dirty from "@/assets/photos/dirty-matcha.jpg";
import mango from "@/assets/photos/mango-matcha.jpg";
import ingredients from "@/assets/photos/matcha-ingredients.jpg";
import pour from "@/assets/photos/matcha-pour.jpg";
import powder from "@/assets/photos/matcha-powder.jpg";
import preparation from "@/assets/photos/matcha-preparation.jpg";
import ritual from "@/assets/photos/matcha-ritual.jpg";
import scene from "@/assets/photos/matcha-scene.jpg";
import slow from "@/assets/photos/matcha-slow.jpg";
import takeaway from "@/assets/photos/matcha-takeaway.jpg";
import together from "@/assets/photos/matcha-together.jpg";
import hero from "@/assets/photos/mori-hero.png";
import strawberry from "@/assets/photos/strawberry-matcha.jpg";
import vanilla from "@/assets/photos/vanilla-matcha.jpg";

export const photos = {
  hero,
  ritual,
  scene,
  takeaway,
  pour,
  slow,
  together,
  ingredients,
  powder,
  preparation,
} satisfies Record<string, StaticImageData>;

const productPhotos: Record<string, StaticImageData> = { classic, strawberry, vanilla, coconut, dirty, mango };

export function productPhoto(imageKey: string): StaticImageData {
  return productPhotos[imageKey] ?? classic;
}
