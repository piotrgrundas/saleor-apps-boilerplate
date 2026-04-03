import { err, ok } from "neverthrow";

import type { StoreErrorCode } from "@/application/domain/objects/error";
import type { AsyncDomainResult } from "@/application/domain/objects/result";
import type { JWKSService } from "@/application/domain/services/jwks-service";
import type { StoreService, WebhookData } from "@/application/domain/services/store-service";
import { getErrorMessage } from "@/lib/error/helpers";
import type { GraphQLResponse } from "@/lib/graphql/types";
import { AppIdDocument, type AppIdQuery } from "./graphql/saleor/AppIdQuery.generated";
import { saleorWebhookHeadersSchema } from "./webhook/schema";

export class SaleorStoreService implements StoreService {
  constructor(private __jwksService: JWKSService) {}

  async getAppId(apiUrl: string, token: string): AsyncDomainResult<string, StoreErrorCode> {
    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: AppIdDocument.toString() }),
      });
    } catch (e) {
      return err({
        code: "STORE_REQUEST_ERROR",
        message: getErrorMessage(e),
      });
    }

    if (!response.ok) {
      return err({
        code: "STORE_REQUEST_ERROR",
        message: `Saleor API request failed: ${response.status}`,
      });
    }

    const json = (await response.json()) as GraphQLResponse<AppIdQuery>;

    if (json.errors?.length) {
      return err({
        code: "STORE_GRAPHQL_ERROR",
        message: `Saleor GraphQL error: ${json.errors[0].message}`,
      });
    }

    const appId = json.data?.app?.id;

    if (!appId) {
      return err({
        code: "STORE_APP_NOT_FOUND_ERROR",
        message: "App ID not found in Saleor response",
      });
    }

    return ok(appId);
  }

  async verifyWebhook(
    headers: Record<string, string | undefined>,
    body: string,
  ): AsyncDomainResult<WebhookData, StoreErrorCode> {
    const parsed = saleorWebhookHeadersSchema.safeParse(headers);
    if (!parsed.success) {
      return err({
        code: "STORE_WEBHOOK_HEADERS_ERROR",
        message: "Invalid webhook headers",
      });
    }

    const {
      "saleor-domain": domain,
      "saleor-api-url": apiUrl,
      "saleor-event": event,
      "saleor-signature": signature,
    } = parsed.data;

    const result = await this.__jwksService.verify(body, signature, domain);

    if (result.isErr()) {
      return err({
        code: "STORE_WEBHOOK_SIGNATURE_ERROR",
        message: "Invalid webhook signature",
        cause: result.error,
      });
    }

    return ok({ domain, apiUrl, event });
  }
}
