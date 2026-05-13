import { config } from "dotenv";
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
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**"],
    env: config({ path: ".env.test" }) as NodeJS.ProcessEnv,
  },
  lint: {
    jsPlugins: [{ name: "import-js", specifier: "./tooling/oxlint/eslint-import.mjs" }],
    rules: {
      "no-unused-vars": "error",
      "import-js/order": [
        "error",
        {
          groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always",
          pathGroups: [{ pattern: "@/**", group: "internal", position: "before" }],
          pathGroupsExcludedImportTypes: ["builtin"],
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
    ignorePatterns: [
      "node_modules/**",
      "dist/**",
      "tooling/**",
      "**/*.generated.*",
      "**/generated.ts",
    ],
    overrides: [
      {
        files: ["**/lib/test/**", "**/*.test.ts", "**/*.spec.ts"],
        rules: {
          "no-empty-pattern": "off",
        },
      },
    ],
  },
  fmt: {
    singleQuote: false,
    semi: true,
    ignorePatterns: [
      "node_modules/**",
      "dist/**",
      "tooling/**",
      "**/*.generated.*",
      "**/generated.ts",
    ],
  },
  staged: {
    "*": "vp check --fix",
  },
});
