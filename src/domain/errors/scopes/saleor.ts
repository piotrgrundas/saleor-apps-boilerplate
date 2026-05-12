import type { ErrorCodeFormat } from "../format";

export const SALEOR_ERROR_CODES = [
  "SALEOR_REQUEST_ERROR",
  "SALEOR_GRAPHQL_ERROR",
  "SALEOR_APP_NOT_FOUND_ERROR",
] as const satisfies readonly ErrorCodeFormat[];

export type SaleorErrorCode = (typeof SALEOR_ERROR_CODES)[number];
