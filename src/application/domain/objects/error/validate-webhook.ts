export interface ValidateWebhookErrorDefs {
  VALIDATE_WEBHOOK_HEADERS_ERROR: never;
  VALIDATE_WEBHOOK_SIGNATURE_ERROR: never;
}
export type ValidateWebhookErrorCode = keyof ValidateWebhookErrorDefs;
