import type { ErrorCodeFormat } from "../format";

export const STORE_ERROR_CODES = [
  "STORE_REQUEST_ERROR",
  "STORE_GRAPHQL_ERROR",
  "STORE_APP_NOT_FOUND_ERROR",
  "STORE_WEBHOOK_HEADERS_ERROR",
  "STORE_WEBHOOK_SIGNATURE_ERROR",
] as const satisfies readonly ErrorCodeFormat[];

export type StoreErrorCode = (typeof STORE_ERROR_CODES)[number];
