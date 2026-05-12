import type { ErrorCodeFormat } from "../format";

export const APP_CONFIG_ERROR_CODES = [
  "APP_CONFIG_READ_ERROR",
  "APP_CONFIG_WRITE_ERROR",
  "APP_CONFIG_DELETE_ERROR",
] as const satisfies readonly ErrorCodeFormat[];

export type AppConfigErrorCode = (typeof APP_CONFIG_ERROR_CODES)[number];
