import { describe, expect, it } from "vitest";
import { FixedClock } from "@/infrastructure/clock";
import { MemoryContactInbox } from "@/infrastructure/memory/memory-contact-inbox";
import { makeSubmitContactMessage } from "./submit-contact-message";

const now = new Date("2026-11-16T10:00:00Z");
const input = { topic: "Hola", name: "Marcos", email: "marcos@example.com", message: "¿Abrís el día de Navidad?", consent: true };

describe("SubmitContactMessage", () => {
  it("delivers a valid message with the time it was received", async () => {
    const inbox = new MemoryContactInbox();
    const result = await makeSubmitContactMessage(inbox, new FixedClock(now))(input);
    expect(result).toEqual({ status: "sent" });
    expect(inbox.messages).toEqual([{ ...input, receivedAt: now }]);
  });

  it("does not deliver an invalid message and reports the errors", async () => {
    const inbox = new MemoryContactInbox();
    const result = await makeSubmitContactMessage(inbox, new FixedClock(now))({ ...input, email: "nope", consent: false });
    expect(result).toEqual({ status: "invalid", errors: { email: "email", consent: "consent" } });
    expect(inbox.messages).toHaveLength(0);
  });

  it("reports a failure when the inbox is unavailable", async () => {
    const broken = { deliver: async () => Promise.reject(new Error("down")) };
    const result = await makeSubmitContactMessage(broken, new FixedClock(now))(input);
    expect(result).toEqual({ status: "failed" });
  });
});
