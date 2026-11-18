"use client";

import { useState } from "react";
import { Icon } from "@/ui/primitives/Icon";
import { cx } from "@/ui/primitives/cx";
import { Mark } from "./Mark";

type Props = { items: readonly string[]; pauseLabel: string; playLabel: string };

export function Marquee({ items, pauseLabel, playLabel }: Props) {
  const [paused, setPaused] = useState(false);

  return (
    <div className={cx("marquee on-dark relative overflow-hidden bg-forest py-[22px] text-cream", paused && "is-paused")}>
      <p className="sr-only">{items.join(". ")}.</p>
      <div className="marquee__track flex w-max" aria-hidden="true">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-9 pr-9">
            {items.map((item, i) => (
              <span key={item} className="contents">
                <span
                  className={cx(
                    "font-display text-[clamp(1.4rem,2.6vw,2.3rem)] font-semibold tracking-tight whitespace-nowrap",
                    i % 2 === 0 && "text-matcha",
                  )}
                >
                  {item}
                </span>
                <Mark className="size-[26px] flex-none text-sage" />
              </span>
            ))}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="absolute top-1/2 right-[var(--gutter)] grid size-10 -translate-y-1/2 place-items-center rounded-full bg-forest-deep text-cream shadow-[inset_0_0_0_1px_var(--color-line-light)] transition-colors hover:bg-matcha hover:text-forest"
        aria-pressed={paused}
        onClick={() => setPaused((p) => !p)}
      >
        <Icon name={paused ? "play" : "pause"} size={16} />
        <span className="sr-only">{paused ? playLabel : pauseLabel}</span>
      </button>
    </div>
  );
}
