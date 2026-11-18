export type PushSubscriptionData = Readonly<{ endpoint: string; keys: Readonly<{ p256dh: string; auth: string }> }>;

export type PushMessage = Readonly<{ title: string; body: string; url: string; tag: string }>;

export interface PushSubscriptionRepository {
  add(orderId: string, subscription: PushSubscriptionData): Promise<void>;
  forOrder(orderId: string): Promise<PushSubscriptionData[]>;
  remove(endpoint: string): Promise<void>;
}

export interface PushSender {
  send(subscription: PushSubscriptionData, message: PushMessage): Promise<"sent" | "gone">;
}
