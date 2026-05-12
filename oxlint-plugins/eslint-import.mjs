// ESM shim for eslint-plugin-import.
// The upstream package sets __esModule=true on a CommonJS module, which makes
// `(await import(...)).default` resolve to undefined under Node's ESM/CJS
// interop. Oxlint's JS plugin loader expects a real default export shaped
// `{ rules: {...} }`, so we re-expose it here.
import { rules } from "eslint-plugin-import";

export default { rules };
