import webpush from "web-push";
import type { PushMessage, PushSender, PushSubscriptionData } from "@/core/application/ports/push";

export class WebPushSender implements PushSender {
  constructor(private readonly vapid: { subject: string; publicKey: string; privateKey: string }) {}

  async send(subscription: PushSubscriptionData, message: PushMessage): Promise<"sent" | "gone"> {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(message), {
        vapidDetails: this.vapid,
        TTL: 60 * 60,
        urgency: "high",
      });
      return "sent";
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) return "gone";
      throw error;
    }
  }
}
