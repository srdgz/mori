import type { Mailer, TransactionalEmail } from "@/core/application/ports/mailer";

export class MemoryMailer implements Mailer {
  readonly sent: TransactionalEmail[] = [];

  async send(email: TransactionalEmail): Promise<void> {
    this.sent.push(email);
  }
}
