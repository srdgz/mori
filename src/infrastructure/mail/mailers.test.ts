import { describe, expect, it } from "vitest";
import { createTransport } from "nodemailer";
import { SmtpMailer } from "./mailers";

describe("SmtpMailer", () => {
  it("sends the rendered email from the configured sender", async () => {
    const transport = createTransport({ jsonTransport: true });
    const sent: string[] = [];
    const original = transport.sendMail.bind(transport);
    transport.sendMail = (async (options: Parameters<typeof original>[0]) => {
      const info = await original(options);
      sent.push(String(info.message));
      return info;
    }) as typeof transport.sendMail;

    const mailer = new SmtpMailer(
      { host: "smtp.example.com", port: 465, user: "shop@example.com", password: "x", from: "MŌRI <shop@example.com>" },
      transport,
    );
    await mailer.send({ kind: "reset_password", to: "ana@example.com", name: "Ana", locale: "es", url: "https://x.test/r?token=1" });

    const message = JSON.parse(sent[0]!) as {
      from: { address: string; name: string };
      to: { address: string }[];
      subject: string;
      html: string;
    };
    expect(message.from).toEqual({ address: "shop@example.com", name: "MŌRI" });
    expect(message.to).toEqual([{ address: "ana@example.com", name: "" }]);
    expect(message.subject).toBe("Cambia tu contraseña · MŌRI");
    expect(message.html).toContain("https://x.test/r?token=1");
  });
});
