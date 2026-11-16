import type { ContactMessage } from "@/core/domain/contact/contact-message";

export interface ContactInbox {
  deliver(message: ContactMessage & { receivedAt: Date }): Promise<void>;
}
