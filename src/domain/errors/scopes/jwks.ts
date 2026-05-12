import type { ErrorCodeFormat } from "../format";

export const JWKS_ERROR_CODES = [
  "JWKS_FETCH_ERROR",
  "JWKS_KEY_IMPORT_ERROR",
  "JWKS_NO_MATCHING_KEY_ERROR",
  "JWKS_VERIFICATION_ERROR",
] as const satisfies readonly ErrorCodeFormat[];

export type JwksErrorCode = (typeof JWKS_ERROR_CODES)[number];
