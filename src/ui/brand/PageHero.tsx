import type { ReactNode } from "react";
import { delay } from "@/ui/primitives/style";

type Props = {
  index: string;
  eyebrow: string;
  lines: readonly string[];
  lede: string;
  kanji?: string;
  aside?: ReactNode;
};

export function PageHero({ index, eyebrow, lines, lede, kanji, aside }: Props) {
  const [first, second] = lines;
  return (
    <section className="relative overflow-hidden pt-[calc(var(--nav-h)+clamp(48px,9vw,120px))] pb-[clamp(48px,7vw,96px)]" data-page-hero>
      {kanji && (
        <span
          className="kanji hero-fade pointer-events-none absolute top-[calc(var(--nav-h)+12px)] right-[var(--gutter)] font-display text-[clamp(6rem,16vw,14rem)] leading-[.8] text-forest/[.07] select-none"
          aria-hidden="true"
          data-kanji
          data-glyph={kanji}
        />
      )}
      <div className="wrap relative">
        <div className="hero-in mb-[clamp(20px,3vw,36px)] flex items-center justify-between gap-4 text-forest" style={delay(0.05)}>
          <span className="eyebrow">{eyebrow}</span>
          <span className="font-display text-sm font-medium tracking-wider" aria-hidden="true">
            {index} / 06
          </span>
        </div>
        <h1 className="display text-[clamp(3rem,12.5vw,13rem)] text-forest">
          <span className="line-mask block">
            <span className="line-in" style={delay(0.1)}>
              {first}
            </span>
          </span>{" "}
          {second && (
            <span className="line-mask block md:pl-[min(14vw,240px)]">
              <span className="line-in" style={delay(0.22)}>
                {second}
              </span>
            </span>
          )}
        </h1>
        <div className="mt-[clamp(28px,4vw,56px)] grid items-end gap-8 md:grid-cols-[1fr_minmax(260px,460px)]">
          {aside ?? <div />}
          <p className="lede hero-in m-0" style={delay(0.45)}>
            {lede}
          </p>
        </div>
      </div>
    </section>
  );
}
