import type { TransactionalEmail } from "@/core/application/ports/mailer";

export type RenderedEmail = { subject: string; html: string; text: string };

type Copy = { subject: string; heading: string; body: string; cta?: string; footer: string };

const copy: Record<TransactionalEmail["kind"], Record<"es" | "en", Copy>> = {
  reset_password: {
    es: {
      subject: "Cambia tu contraseña · MŌRI",
      heading: "Hola, {name}",
      body: "Hemos recibido una petición para cambiar tu contraseña. El enlace caduca en una hora.",
      cta: "Elegir contraseña nueva",
      footer: "Si no lo has pedido tú, ignora este mensaje: tu contraseña sigue igual.",
    },
    en: {
      subject: "Reset your password · MŌRI",
      heading: "Hi {name}",
      body: "We received a request to reset your password. The link expires in one hour.",
      cta: "Choose a new password",
      footer: "If you didn’t ask for this, ignore this email: your password stays the same.",
    },
  },
  password_changed: {
    es: {
      subject: "Tu contraseña ha cambiado · MŌRI",
      heading: "Hola, {name}",
      body: "La contraseña de tu cuenta de MŌRI acaba de cambiar.",
      footer: "Si no has sido tú, recupera tu cuenta desde «¿La has olvidado?» y escríbenos.",
    },
    en: {
      subject: "Your password was changed · MŌRI",
      heading: "Hi {name}",
      body: "The password of your MŌRI account was just changed.",
      footer: "If this wasn’t you, recover your account with “Forgot it?” and get in touch.",
    },
  },
};

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderEmail(email: TransactionalEmail): RenderedEmail {
  const c = copy[email.kind][email.locale];
  const heading = c.heading.replace("{name}", email.name);
  const url = "url" in email ? email.url : null;
  const button =
    url && c.cta
      ? `<p style="margin:32px 0"><a href="${escape(url)}" style="background:#183d2b;color:#e8e1d4;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">${escape(c.cta)}</a></p>`
      : "";
  const html = `<!doctype html><html lang="${email.locale}"><body style="margin:0;background:#f3efe7;font-family:Helvetica,Arial,sans-serif;color:#252725">
<div style="max-width:520px;margin:0 auto;padding:40px 28px">
<p style="font-size:22px;letter-spacing:.2em;color:#183d2b;font-weight:700;margin:0 0 32px">MŌRI</p>
<h1 style="font-size:26px;line-height:1.2;color:#183d2b;margin:0 0 16px">${escape(heading)}</h1>
<p style="font-size:16px;line-height:1.6;margin:0">${escape(c.body)}</p>
${button}
<p style="font-size:13px;line-height:1.6;color:#4a4e49;margin:32px 0 0">${escape(c.footer)}</p>
<p style="font-size:12px;color:#4a4e49;margin:32px 0 0">MŌRI Matcha Bar &amp; Culture · Malasaña, Madrid</p>
</div></body></html>`;
  const text = [heading, "", c.body, url ? `\n${c.cta}: ${url}` : "", "", c.footer].join("\n");
  return { subject: c.subject, html, text };
}
