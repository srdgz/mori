"use server";

import { z } from "zod";
import { container } from "@/composition/container";
import type { ContactFormState } from "@/ui/brand/ContactForm";

const schema = z.object({
  topic: z.string().max(80).default(""),
  name: z.string().max(120).default(""),
  email: z.string().max(200).default(""),
  message: z.string().max(4000).default(""),
  consent: z.literal("on").optional(),
});

export type { ContactFormState };

export async function sendContactMessage(_previous: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "failed" };
  const { consent, ...fields } = parsed.data;
  return container().submitContactMessage({ ...fields, consent: consent === "on" });
}
