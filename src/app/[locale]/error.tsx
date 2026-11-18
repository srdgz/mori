"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { Mark } from "@/ui/brand/Mark";
import { Icon } from "@/ui/primitives/Icon";

type Props = { error: Error & { digest?: string }; retry: () => void };

export default function ErrorPage({ error, retry }: Props) {
  const t = useTranslations("common");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section className="error-page">
      <meta name="robots" content="noindex" />
      <div className="wrap">
        <span className="mx-auto mb-8 block size-20 text-forest">
          <Mark className="size-full" />
        </span>
        <h1 ref={heading} tabIndex={-1} className="display text-[clamp(2.6rem,8vw,5.5rem)] text-forest outline-none">
          {t("errorTitle")}
        </h1>
        <p className="lede mx-auto mt-5">{t("errorText")}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn" onClick={() => retry()}>
            {t("retry")}
            <Icon name="refresh" />
          </button>
          <Link className="btn btn--ghost" href="/">
            {t("backHome")}
          </Link>
        </div>
        {error.digest && <p className="error-page__ref">{t("errorRef", { ref: error.digest })}</p>}
      </div>
    </section>
  );
}
