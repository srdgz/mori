export const THEME_COOKIE = "mori-theme";

export type ThemeChoice = "system" | "light" | "dark";

export const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);if(m)document.documentElement.dataset.theme=m[1];}catch(e){}})();`;

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  document.cookie = `${THEME_COOKIE}=${choice}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event("mori:theme"));
}

export function currentChoice(): ThemeChoice {
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=(system|light|dark)`));
  return (match?.[1] as ThemeChoice | undefined) ?? "system";
}

export function prefersDark(): boolean {
  const theme = document.documentElement.dataset.theme;
  if (theme) return theme === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
