type Props = { className?: string; label?: string };

export function Mark({ className, label }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 1232 1204"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <use href="#mori-emblem" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 2432 740" aria-hidden="true" focusable="false">
      <use href="#mori-wordmark" />
    </svg>
  );
}
