export const CONTACT_FIELDS = ["name", "email", "message", "consent"] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

export type ContactError = "required" | "email" | "short" | "consent";

export type ContactMessageInput = Readonly<{
  topic: string;
  name: string;
  email: string;
  message: string;
  consent: boolean;
}>;

export type ContactMessage = ContactMessageInput & Readonly<{ consent: true }>;

export type ContactValidation =
  Readonly<{ ok: true; value: ContactMessage }> | Readonly<{ ok: false; errors: Readonly<Partial<Record<ContactField, ContactError>>> }>;

export const MIN_MESSAGE_LENGTH = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateField(field: ContactField, input: ContactMessageInput): ContactError | null {
  switch (field) {
    case "name":
      return input.name.trim() ? null : "required";
    case "email":
      if (!input.email.trim()) return "required";
      return EMAIL.test(input.email.trim()) ? null : "email";
    case "message":
      if (!input.message.trim()) return "required";
      return input.message.trim().length >= MIN_MESSAGE_LENGTH ? null : "short";
    case "consent":
      return input.consent ? null : "consent";
  }
}

export function validateContactMessage(input: ContactMessageInput): ContactValidation {
  const errors: Partial<Record<ContactField, ContactError>> = {};
  for (const field of CONTACT_FIELDS) {
    const error = validateField(field, input);
    if (error) errors[field] = error;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      topic: input.topic.trim(),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      message: input.message.trim(),
      consent: true,
    },
  };
}
