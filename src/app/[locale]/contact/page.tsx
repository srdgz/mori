import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { container } from "@/composition/container";
import { phoneHref } from "@/core/domain/store/store-info";
import type { AppLocale } from "@/i18n/routing";
import { ContactForm, type ContactFormCopy } from "@/ui/brand/ContactForm";
import { Mark } from "@/ui/brand/Mark";
import { PageHero } from "@/ui/brand/PageHero";
import { Icon, type IconName } from "@/ui/primitives/Icon";
import { pageMetadata } from "@/ui/seo/metadata";
import { sendContactMessage } from "./actions";

type Props = { params: Promise<{ locale: AppLocale }> };

const copyKeys = [
  "formH",
  "required",
  "topic",
  "name",
  "email",
  "message",
  "messageHint",
  "consent",
  "send",
  "demo",
  "doneH",
  "doneP",
  "again",
  "msgRequired",
  "msgEmail",
  "msgShort",
  "msgConsent",
  "msgSending",
  "msgFailed",
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return pageMetadata({ locale, href: "/contact", title: t("title"), description: t("description") });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, common, store] = await Promise.all([getTranslations("contact"), getTranslations("common"), container().getStoreInfo()]);
  const labels = t.raw("rows") as string[];

  const channels: { label: string; value: string; href: string; icon: IconName; external: boolean }[] = [
    { label: labels[0] ?? "", value: store.email, href: `mailto:${store.email}`, icon: "mail", external: false },
    { label: labels[1] ?? "", value: store.phone, href: phoneHref(store.phone), icon: "phone", external: false },
    { label: labels[2] ?? "", value: store.instagram, href: "https://www.instagram.com/", icon: "ig", external: true },
    { label: labels[3] ?? "", value: store.instagram, href: "https://www.tiktok.com/", icon: "tt", external: true },
  ];

  const copy = {
    ...(Object.fromEntries(copyKeys.map((key) => [key, t(key)])) as Omit<ContactFormCopy, "topics" | "msgSummary">),
    topics: t.raw("topics") as string[],
    msgSummary: t.raw("msgSummary") as string,
  } satisfies ContactFormCopy;

  return (
    <>
      <PageHero index="05" eyebrow={t("eyebrow")} lines={t.raw("heroLines") as string[]} lede={t("lede")} />

      <section className="pb-[clamp(80px,12vw,170px)]">
        <div className="wrap grid items-start gap-[clamp(32px,6vw,110px)] lg:grid-cols-[1fr_1.25fr]">
          <div>
            <h2 className="eyebrow" data-anim="fade">
              {t("channels")}
            </h2>
            <ul className="mt-7 border-t border-line" data-anim="fade">
              {channels.map((channel) => (
                <li key={channel.href} className="border-b border-line">
                  <a
                    className="channel flex items-center justify-between gap-3 py-5"
                    href={channel.href}
                    target={channel.external ? "_blank" : undefined}
                    rel={channel.external ? "noopener noreferrer" : undefined}
                  >
                    <span>
                      <small className="mb-1 block text-xs tracking-[.18em] text-ink-soft uppercase">{channel.label}</small>
                      <strong className="font-display text-[clamp(1.15rem,2vw,1.6rem)] font-semibold tracking-tight break-all">
                        {channel.value}
                      </strong>
                      {channel.external && <span className="sr-only"> {common("newTab")}</span>}
                    </span>
                    <Icon name={channel.icon} size={20} className="flex-none" />
                  </a>
                </li>
              ))}
            </ul>
            <div className="on-dark mt-12 rounded-[var(--radius-card)] bg-forest p-[clamp(22px,3vw,34px)] text-cream" data-anim="fade">
              <Mark className="mb-5 size-10 text-matcha" />
              <h2 className="h-md">{t("jobsH")}</h2>
              <p className="mt-3 text-sage">{t("jobsP")}</p>
            </div>
          </div>

          <ContactForm copy={copy} action={sendContactMessage} />
        </div>
      </section>
    </>
  );
}
