import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createTransport, type Transporter } from "nodemailer";
import { Resend } from "resend";
import type { Mailer, TransactionalEmail } from "@/core/application/ports/mailer";
import { renderEmail } from "./templates";

export class ResendMailer implements Mailer {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(email: TransactionalEmail): Promise<void> {
    const { subject, html, text } = renderEmail(email);
    const { error } = await this.client.emails.send({ from: this.from, to: email.to, subject, html, text });
    if (error) throw new Error(`Resend rejected the email: ${error.message}`);
  }
}

export type SmtpConfig = { host: string; port: number; user: string; password: string; from: string };

export class SmtpMailer implements Mailer {
  private readonly transport: Transporter;

  constructor(
    private readonly config: SmtpConfig,
    transport?: Transporter,
  ) {
    this.transport =
      transport ??
      createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.password },
      });
  }

  async send(email: TransactionalEmail): Promise<void> {
    const { subject, html, text } = renderEmail(email);
    await this.transport.sendMail({ from: this.config.from, to: email.to, subject, html, text });
  }
}

export class OutboxMailer implements Mailer {
  constructor(private readonly path: string) {}

  async send(email: TransactionalEmail): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify({ ...email, subject: renderEmail(email).subject })}\n`);
  }
}

export class ConsoleMailer implements Mailer {
  async send(email: TransactionalEmail): Promise<void> {
    const { subject } = renderEmail(email);
    console.info(`[mail] ${subject} → ${email.to}${"url" in email ? `\n${email.url}` : ""}`);
  }
}
