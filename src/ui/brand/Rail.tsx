"use client";

import { useRef, type ReactNode } from "react";
import { Icon } from "@/ui/primitives/Icon";

type Props = {
  label: string;
  prevLabel: string;
  nextLabel: string;
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
  labelledBy: string;
};

export function Rail({ label, prevLabel, nextLabel, header, footer, children, labelledBy }: Props) {
  const track = useRef<HTMLUListElement>(null);

  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.getBoundingClientRect().width + 24 : 320;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: step * direction, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="bg-cream">
      <section
        className="collection relative overflow-hidden bg-cream py-[clamp(72px,10vw,140px)]"
        data-hscroll
        aria-labelledby={labelledBy}
      >
        <div className="coll-head wrap mb-[clamp(28px,4vw,56px)] grid items-end gap-x-10 gap-y-5 lg:grid-cols-[1fr_auto_auto]">
          {header}
          <div className="rail-ctrl flex gap-2.5" data-anim="fade">
            <button type="button" className="rail-btn" onClick={() => scroll(-1)}>
              <Icon name="left" size={18} />
              <span className="sr-only">{prevLabel}</span>
            </button>
            <button type="button" className="rail-btn" onClick={() => scroll(1)}>
              <Icon name="arrow" size={18} />
              <span className="sr-only">{nextLabel}</span>
            </button>
          </div>
        </div>
        <ul ref={track} className="rail-track" data-rail-track role="list" aria-label={label} tabIndex={0}>
          {children}
        </ul>
        {footer}
      </section>
    </div>
  );
}
