import { err, ok } from "neverthrow";

import type { JWKSService } from "@/domain/ports/jwks-service";
import type { StoreService } from "@/domain/ports/store-service";
import { getErrorMessage } from "@/lib/error/helpers";
import type { GraphQLResponse } from "@/lib/graphql/types";
import { saleorWebhookHeadersSchema } from "@/infrastructure/saleor/webhook/schema";
import { AppIdDocument, type AppIdQuery } from "./graphql/saleor/AppIdQuery.generated";

export const createSaleorStoreService = (jwksService: JWKSService): StoreService => ({
  async getAppId({ apiUrl, token }) {
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
      return err([
        {
          code: "STORE_REQUEST_ERROR",
          message: getErrorMessage(e),
          details: { cause: e },
        },
      ]);
    }

    if (!response.ok) {
      return err([
        {
          code: "STORE_REQUEST_ERROR",
          message: `Saleor API request failed: ${response.status}`,
        },
      ]);
    }

    const json = (await response.json()) as GraphQLResponse<AppIdQuery>;

    if (json.errors?.length) {
      return err([
        {
          code: "STORE_GRAPHQL_ERROR",
          message: `Saleor GraphQL error: ${json.errors[0].message}`,
          details: { errors: json.errors },
        },
      ]);
    }

    const appId = json.data?.app?.id;

    if (!appId) {
      return err([
        {
          code: "STORE_APP_NOT_FOUND_ERROR",
          message: "App ID not found in Saleor response",
        },
      ]);
    }

    return ok(appId);
  },

  async verifyWebhook({ headers, body }) {
    const parsed = saleorWebhookHeadersSchema.safeParse(headers);
    if (!parsed.success) {
      return err([
        {
          code: "STORE_WEBHOOK_HEADERS_ERROR",
          message: "Invalid webhook headers",
          details: { issues: parsed.error.issues },
        },
      ]);
    }

    const {
      "saleor-domain": domain,
      "saleor-api-url": apiUrl,
      "saleor-event": event,
      "saleor-signature": signature,
    } = parsed.data;

    const result = await jwksService.verify({ payload: body, signature, saleorDomain: domain });

    if (result.isErr()) {
      return err([
        {
          code: "STORE_WEBHOOK_SIGNATURE_ERROR",
          message: "Invalid webhook signature",
          details: { cause: result.error },
        },
      ]);
    }

    return ok({ domain, apiUrl, event });
  },
});
