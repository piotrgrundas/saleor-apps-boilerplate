import type { ErrorCodeFormat } from "../format";

export const INSTALL_APP_ERROR_CODES = [
  "INSTALL_APP_DOMAIN_NOT_ALLOWED_ERROR",
  "INSTALL_APP_FETCH_ID_ERROR",
  "INSTALL_APP_SAVE_CONFIG_ERROR",
  "INSTALL_APP_JWKS_PREFETCH_ERROR",
] as const satisfies readonly ErrorCodeFormat[];

export type InstallAppErrorCode = (typeof INSTALL_APP_ERROR_CODES)[number];
