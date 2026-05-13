/**
 * ESM shim for `eslint-plugin-import` so Oxlint can load it as a JS plugin.
 *
 * Why this exists:
 *   - `eslint-plugin-import` ships as CommonJS and sets `__esModule = true`
 *     on its `module.exports`. Under Node's ESM/CJS interop, that marker makes
 *     `(await import("eslint-plugin-import")).default` resolve to `undefined`
 *     instead of the plugin object.
 *   - Oxlint's JS plugin loader (`lint.jsPlugins[].specifier`) expects a real
 *     ESM default export shaped `{ rules: { ... } }`.
 *
 * Fix: re-export the named `rules` binding as the default. Oxlint then sees a
 * proper plugin object and the `import-js/*` rules become available.
 *
 * Wired in `vite.config.ts` via:
 *   lint.jsPlugins = [{ name: "import-js", specifier: "./tooling/oxlint/eslint-import.mjs" }]
 */
import { rules } from "eslint-plugin-import";

export default { rules };
