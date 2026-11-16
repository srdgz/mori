import type { ContactInbox } from "@/core/application/ports/contact-inbox";
import type { ContactMessage } from "@/core/domain/contact/contact-message";

export class MemoryContactInbox implements ContactInbox {
  readonly messages: (ContactMessage & { receivedAt: Date })[] = [];

  async deliver(message: ContactMessage & { receivedAt: Date }): Promise<void> {
    this.messages.push(message);
  }
}
