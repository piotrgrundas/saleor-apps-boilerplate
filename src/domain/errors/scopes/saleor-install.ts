import type { ErrorCodeFormat } from "../format";

export const SALEOR_INSTALL_ERROR_CODES = [
  "SALEOR_INSTALL_DOMAIN_NOT_ALLOWED_ERROR",
  "SALEOR_INSTALL_FETCH_ID_ERROR",
  "SALEOR_INSTALL_SAVE_CONFIG_ERROR",
  "SALEOR_INSTALL_JWKS_PREFETCH_ERROR",
] as const satisfies readonly ErrorCodeFormat[];

export type SaleorInstallErrorCode = (typeof SALEOR_INSTALL_ERROR_CODES)[number];
