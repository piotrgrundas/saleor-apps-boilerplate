import type { AsyncResult } from "../errors/result";
import type { StoreErrorCode } from "../errors/scopes/store";

export type WebhookData = {
  domain: string;
  apiUrl: string;
  event: string;
};

export type StoreService = {
  getAppId(input: { apiUrl: string; token: string }): AsyncResult<string, StoreErrorCode>;
  verifyWebhook(input: {
    headers: Record<string, string | undefined>;
    body: string;
  }): AsyncResult<WebhookData, StoreErrorCode>;
};
