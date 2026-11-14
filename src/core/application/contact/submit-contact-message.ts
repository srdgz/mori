import {
  validateContactMessage,
  type ContactError,
  type ContactField,
  type ContactMessageInput,
} from "@/core/domain/contact/contact-message";
import type { Clock } from "../ports/clock";
import type { ContactInbox } from "../ports/contact-inbox";

export type SubmitContactResult =
  { status: "sent" } | { status: "invalid"; errors: Partial<Record<ContactField, ContactError>> } | { status: "failed" };

export type SubmitContactMessage = (input: ContactMessageInput) => Promise<SubmitContactResult>;

export function makeSubmitContactMessage(inbox: ContactInbox, clock: Clock): SubmitContactMessage {
  return async (input) => {
    const validation = validateContactMessage(input);
    if (!validation.ok) return { status: "invalid", errors: validation.errors };
    try {
      await inbox.deliver({ ...validation.value, receivedAt: clock.now() });
      return { status: "sent" };
    } catch {
      return { status: "failed" };
    }
  };
}
