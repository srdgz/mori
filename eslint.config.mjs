import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import { defineConfig, globalIgnores } from "eslint/config";

const layers = [
  { type: "domain", pattern: "src/core/domain/**" },
  { type: "application", pattern: "src/core/application/**" },
  { type: "infrastructure", pattern: "src/infrastructure/**" },
  { type: "composition", pattern: "src/composition/**" },
  { type: "i18n", pattern: "src/i18n/**" },
  { type: "ui", pattern: "src/ui/**" },
  { type: "app", pattern: "src/app/**" },
  { type: "assets", pattern: "src/assets/**" },
  { type: "styles", pattern: "src/styles/**" },
  { type: "test", pattern: "src/test/**" },
];

const allowFrom = (from, to) => ({ from: { element: { type: from } }, allow: { to: { element: { types: to } } } });

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "node_modules/**", "playwright-report/**", "test-results/**", "coverage/**", "next-env.d.ts"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "src/proxy.ts"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": layers,
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      "boundaries/no-unknown-files": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message: "{{ from.element.types.[0] }} must not import {{ to.element.types.[0] }}",
          policies: [
            allowFrom("domain", ["domain"]),
            allowFrom("application", ["domain", "application"]),
            allowFrom("infrastructure", ["domain", "application", "infrastructure"]),
            allowFrom("composition", ["domain", "application", "infrastructure", "composition", "i18n"]),
            allowFrom("i18n", ["i18n"]),
            allowFrom("ui", ["domain", "application", "i18n", "ui", "assets"]),
            allowFrom("app", ["domain", "application", "composition", "i18n", "ui", "styles", "app"]),
            allowFrom("test", ["domain", "application", "infrastructure", "test"]),
          ],
        },
      ],
    },
  },
]);
