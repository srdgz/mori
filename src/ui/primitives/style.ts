import type { CSSProperties } from "react";

export function delay(seconds: number): CSSProperties {
  return { "--d": `${seconds}s` } as CSSProperties;
}

export function cssVar(name: `--${string}`, value: string): CSSProperties {
  return { [name]: value } as CSSProperties;
}
