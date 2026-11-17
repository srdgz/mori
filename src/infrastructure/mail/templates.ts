import type { OrderConfirmation, TransactionalEmail } from "@/core/application/ports/mailer";
import { formatMoney } from "@/core/domain/shared/money";

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
  order_confirmed: {
    es: {
      subject: "Pedido {code} confirmado · MŌRI",
      heading: "¡Gracias, {name}!",
      body: "Tu pedido {code} está confirmado. {when}",
      cta: "Seguir mi pedido",
      footer: "Guarda este email: el enlace te deja ver el estado de tu pedido sin iniciar sesión.",
    },
    en: {
      subject: "Order {code} confirmed · MŌRI",
      heading: "Thank you, {name}!",
      body: "Your order {code} is confirmed. {when}",
      cta: "Track my order",
      footer: "Keep this email: the link shows your order status without signing in.",
    },
  },
  order_ready: {
    es: {
      subject: "Tu pedido {code} está listo · MŌRI",
      heading: "¡Está listo, {name}!",
      body: "Tu pedido {code} te espera en la barra de C/ Espíritu Santo, 18. Enséñanos el código al llegar.",
      cta: "Ver mi pedido",
      footer: "Lo guardamos frío o caliente, como lo pediste, hasta que vengas.",
    },
    en: {
      subject: "Your order {code} is ready · MŌRI",
      heading: "It’s ready, {name}!",
      body: "Your order {code} is waiting at the bar on C/ Espíritu Santo, 18. Show us the code when you arrive.",
      cta: "View my order",
      footer: "We keep it hot or iced, the way you ordered it, until you get here.",
    },
  },
  order_out_for_delivery: {
    es: {
      subject: "Tu pedido {code} va de camino · MŌRI",
      heading: "Va de camino, {name}",
      body: "Tu pedido {code} acaba de salir de la tienda. Llegará en unos minutos.",
      cta: "Seguir mi pedido",
      footer: "Si no vas a estar, avísanos respondiendo a este email.",
    },
    en: {
      subject: "Your order {code} is on its way · MŌRI",
      heading: "On its way, {name}",
      body: "Your order {code} just left the shop. It’ll be with you in a few minutes.",
      cta: "Track my order",
      footer: "If you won’t be in, let us know by replying to this email.",
    },
  },
};

const fulfilmentCopy = {
  es: {
    pickup: "Recógelo en C/ Espíritu Santo, 18 (Malasaña) el {date} a las {time}.",
    delivery: "Lo llevamos a tu dirección en 30–45 minutos.",
    total: "Total",
  },
  en: {
    pickup: "Pick it up at C/ Espíritu Santo, 18 (Malasaña) on {date} at {time}.",
    delivery: "We’ll bring it to your door in 30–45 minutes.",
    total: "Total",
  },
};

function orderDetails(email: OrderConfirmation): { sentence: string; rows: string[] } {
  const words = fulfilmentCopy[email.locale];
  let sentence = words.delivery;
  if (email.fulfilment === "pickup" && email.slotStart) {
    const locale = email.locale === "es" ? "es-ES" : "en-GB";
    const timeZone = "Europe/Madrid";
    const date = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone }).format(email.slotStart);
    const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(email.slotStart);
    sentence = words.pickup.replace("{date}", date).replace("{time}", time);
  }
  const rows = [...email.lines.map((l) => `${l.quantity} × ${l.name}`), `${words.total}: ${formatMoney(email.total, email.locale)}`];
  return { sentence, rows };
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderEmail(email: TransactionalEmail): RenderedEmail {
  const c = copy[email.kind][email.locale];
  const code = "code" in email ? email.code : "";
  const details = email.kind === "order_confirmed" ? orderDetails(email) : null;
  const heading = c.heading.replace("{name}", email.name);
  const body = c.body.replace("{code}", code).replace("{when}", details?.sentence ?? "");
  const subject = c.subject.replace("{code}", code);
  const url = "url" in email ? email.url : null;
  const button =
    url && c.cta
      ? `<p style="margin:32px 0"><a href="${escape(url)}" style="background:#183d2b;color:#e8e1d4;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">${escape(c.cta)}</a></p>`
      : "";
  const list = details
    ? `<ul style="margin:24px 0 0;padding:16px 20px;background:#e8e1d4;border-radius:12px;list-style:none;font-size:15px;line-height:1.8">${details.rows.map((r) => `<li>${escape(r)}</li>`).join("")}</ul>`
    : "";
  const html = `<!doctype html><html lang="${email.locale}"><body style="margin:0;background:#f3efe7;font-family:Helvetica,Arial,sans-serif;color:#252725">
<div style="max-width:520px;margin:0 auto;padding:40px 28px">
<p style="font-size:22px;letter-spacing:.2em;color:#183d2b;font-weight:700;margin:0 0 32px">MŌRI</p>
<h1 style="font-size:26px;line-height:1.2;color:#183d2b;margin:0 0 16px">${escape(heading)}</h1>
<p style="font-size:16px;line-height:1.6;margin:0">${escape(body)}</p>
${list}
${button}
<p style="font-size:13px;line-height:1.6;color:#4a4e49;margin:32px 0 0">${escape(c.footer)}</p>
<p style="font-size:12px;color:#4a4e49;margin:32px 0 0">MŌRI Matcha Bar &amp; Culture · Malasaña, Madrid</p>
</div></body></html>`;
  const text = [heading, "", body, ...(details?.rows ?? []), url ? `\n${c.cta}: ${url}` : "", "", c.footer].join("\n");
  return { subject, html, text };
}
