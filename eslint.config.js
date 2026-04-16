import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "public/vendor/**",
      "public/legacy/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: false
      }
    },
    rules: {
      "no-console": "off"
    }
  },
  {
    files: ["tests/**/*.ts", "playwright.config.ts", "vite.config.ts", "vitest.config.ts", "scripts/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: false
      }
    }
  }
);
