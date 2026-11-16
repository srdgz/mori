import type { Locale } from "@/core/domain/shared/locale";

type Recipient = { to: string; name: string; locale: Locale };

export type TransactionalEmail = (Recipient & { kind: "reset_password"; url: string }) | (Recipient & { kind: "password_changed" });

export interface Mailer {
  send(email: TransactionalEmail): Promise<void>;
}
