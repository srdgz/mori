import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://mori-matcha-bar.vercel.app",
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
    routing: { prefixDefaultLocale: false },
  },
  build: { inlineStylesheets: "always" },
  vite: { plugins: [tailwindcss()] },
});
