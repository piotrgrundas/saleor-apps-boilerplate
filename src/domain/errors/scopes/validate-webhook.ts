import type { ErrorCodeFormat } from "../format";

export const VALIDATE_WEBHOOK_ERROR_CODES = [
  "VALIDATE_WEBHOOK_HEADERS_ERROR",
  "VALIDATE_WEBHOOK_SIGNATURE_ERROR",
] as const satisfies readonly ErrorCodeFormat[];

export type ValidateWebhookErrorCode = (typeof VALIDATE_WEBHOOK_ERROR_CODES)[number];
