"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { cx } from "@/ui/primitives/cx";
import { applyTheme, currentChoice, prefersDark, type ThemeChoice } from "./theme";

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  window.addEventListener("mori:theme", callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("mori:theme", callback);
  };
}

export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, prefersDark, () => false);
}

export function ThemeSync({ saved }: { saved: ThemeChoice }) {
  useEffect(() => {
    if (currentChoice() !== saved) applyTheme(saved);
  }, [saved]);
  return null;
}

const choices: ThemeChoice[] = ["system", "light", "dark"];

export function ThemePicker({ saved, save }: { saved: ThemeChoice; save: (theme: ThemeChoice) => Promise<boolean> }) {
  const t = useTranslations("account.appearance");
  const [choice, setChoice] = useState<ThemeChoice>(saved);
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();

  function pick(next: ThemeChoice) {
    setChoice(next);
    applyTheme(next);
    startTransition(async () => {
      setMessage((await save(next)) ? t("saved") : t("error"));
    });
  }

  return (
    <fieldset className="grid gap-4">
      <legend className="sr-only">{t("title")}</legend>
      <div className="theme-picker">
        {choices.map((value) => (
          <label key={value} className={cx("theme-picker__option", choice === value && "is-current")}>
            <input type="radio" name="theme" value={value} checked={choice === value} onChange={() => pick(value)} className="sr-only" />
            <span className={cx("theme-picker__preview", `is-${value}`)} aria-hidden="true">
              <span />
              <span />
            </span>
            <span className="font-semibold">{t(value)}</span>
            <span className="text-xs text-ink-soft">{t(`${value}Hint`)}</span>
          </label>
        ))}
      </div>
      <p role="status" className="text-sm text-ink-soft">
        {message}
      </p>
    </fieldset>
  );
}
