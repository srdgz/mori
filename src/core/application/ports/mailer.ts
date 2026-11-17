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

export type OrderUpdate = Recipient & {
  kind: "order_ready" | "order_out_for_delivery";
  code: string;
  url: string;
};

export type TransactionalEmail =
  (Recipient & { kind: "reset_password"; url: string }) | (Recipient & { kind: "password_changed" }) | OrderConfirmation | OrderUpdate;

export interface Mailer {
  send(email: TransactionalEmail): Promise<void>;
}
