import { cx } from "@/ui/primitives/cx";

const STAR = "M12 2.8l2.75 5.75 6.3.86-4.6 4.37 1.14 6.25L12 17.03l-5.6 3l1.14-6.25-4.6-4.37 6.3-.86z";

export function Stars({ value, label, size = 18, className }: { value: number; label?: string; size?: number; className?: string }) {
  return (
    <span className={cx("stars", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <svg key={n} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={STAR} className="stars__empty" />
            {fill > 0 && <path d={STAR} className="stars__full" style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }} />}
          </svg>
        );
      })}
    </span>
  );
}

export { STAR };
