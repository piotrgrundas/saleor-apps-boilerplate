import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  lint: {
    rules: {
      "no-unused-vars": "error",
    },
    ignorePatterns: [
      "node_modules/**",
      "dist/**",
      "scripts/**",
      "**/*.generated.*",
      "**/generated.ts",
    ],
  },
  fmt: {
    singleQuote: false,
    semi: true,
    ignorePatterns: [
      "node_modules/**",
      "dist/**",
      "scripts/**",
      "**/*.generated.*",
      "**/generated.ts",
    ],
  },
  staged: {
    "*": "vp check --fix",
  },
});
