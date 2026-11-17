import type { Locale } from "@/core/domain/shared/locale";
import type { Money } from "@/core/domain/shared/money";

type Recipient = { to: string; name: string; locale: Locale };

export type OrderConfirmation = Recipient & {
  kind: "order_confirmed";
  code: string;
  url: string;
  total: Money;
  fulfilment: "pickup" | "delivery";
  slotStart: Date | null;
  lines: readonly { name: string; quantity: number }[];
};

export type TransactionalEmail =
  (Recipient & { kind: "reset_password"; url: string }) | (Recipient & { kind: "password_changed" }) | OrderConfirmation;

export interface Mailer {
  send(email: TransactionalEmail): Promise<void>;
}
