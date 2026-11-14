import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Mark } from "@/ui/brand/Mark";
import { Icon } from "@/ui/primitives/Icon";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <section className="grid min-h-svh place-items-center pt-[var(--nav-h)] text-center">
      <div className="wrap">
        <span data-draw className="mx-auto mb-8 block size-20 text-forest">
          <Mark className="size-full" />
        </span>
        <h1 className="display text-[clamp(5rem,22vw,16rem)] text-forest">
          <span className="sr-only">{t("notFoundTitle")} · </span>404
        </h1>
        <p className="lede mx-auto mt-4">{t("notFound")}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link className="btn" href="/">
            {t("backHome")}
            <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </section>
  );
}
