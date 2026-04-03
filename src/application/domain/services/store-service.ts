import type { StoreErrorCode } from "../objects/error";
import type { AsyncDomainResult } from "../objects/result";

export interface WebhookData {
  domain: string;
  apiUrl: string;
  event: string;
}

export interface StoreService {
  getAppId(apiUrl: string, token: string): AsyncDomainResult<string, StoreErrorCode>;

  verifyWebhook(
    headers: Record<string, string | undefined>,
    body: string,
  ): AsyncDomainResult<WebhookData, StoreErrorCode>;
}
