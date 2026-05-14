import type { ErrorCodeFormat } from "../format";

export const GRAPHQL_ERROR_CODES = [
  "GRAPHQL_REQUEST_ERROR",
  "GRAPHQL_TIMEOUT_ERROR",
  "GRAPHQL_HTTP_ERROR",
  "GRAPHQL_INVALID_RESPONSE_ERROR",
  "GRAPHQL_RESPONSE_ERROR",
] as const satisfies readonly ErrorCodeFormat[];

export type GraphqlErrorCode = (typeof GRAPHQL_ERROR_CODES)[number];
