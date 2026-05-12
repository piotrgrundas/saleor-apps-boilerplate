import { err } from "neverthrow";
import { describe, expect } from "vite-plus/test";
import { it } from "@/lib/test/it";

import type { StoreService } from "@/domain/ports/store-service";
import { createMockStoreService } from "@/lib/test/mock";
import { validateWebhookUseCase } from "./validate-webhook-use-case";

const INPUT = {
  headers: {
    "saleor-domain": "test.saleor.cloud",
    "saleor-api-url": "https://test.saleor.cloud/graphql/",
    "saleor-event": "PRODUCT_UPDATED",
    "saleor-signature": "valid-signature",
  },
  body: '{"event":"product_updated"}',
};

describe("validateWebhookUseCase", () => {
  it("returns validated webhook data on success", async () => {
    // given
    const validate = validateWebhookUseCase({ storeService: createMockStoreService() });

    // when
    const result = await validate(INPUT);

    // then
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      domain: "test.example.com",
      apiUrl: "https://test.example.com/graphql/",
      event: "TEST_EVENT",
    });
  });

  it("returns VALIDATE_WEBHOOK_HEADERS_ERROR when headers are invalid", async () => {
    // given
    const failingService: StoreService = {
      ...createMockStoreService(),
      verifyWebhook: async () =>
        err([{ code: "STORE_WEBHOOK_HEADERS_ERROR", message: "Invalid webhook headers" }]),
    };
    const validate = validateWebhookUseCase({ storeService: failingService });

    // when
    const result = await validate({ headers: {}, body: "" });

    // then
    const [error] = result._unsafeUnwrapErr();
    expect(error.code).toBe("VALIDATE_WEBHOOK_HEADERS_ERROR");
    expect((error.details as { cause: unknown }).cause).toEqual([
      { code: "STORE_WEBHOOK_HEADERS_ERROR", message: "Invalid webhook headers" },
    ]);
  });

  it("returns VALIDATE_WEBHOOK_SIGNATURE_ERROR when verification fails", async () => {
    // given
    const failingService: StoreService = {
      ...createMockStoreService(),
      verifyWebhook: async () =>
        err([
          {
            code: "STORE_WEBHOOK_SIGNATURE_ERROR",
            message: "Invalid webhook signature",
            details: { cause: { code: "JWKS_NO_MATCHING_KEY_ERROR", message: "No matching key" } },
          },
        ]),
    };
    const validate = validateWebhookUseCase({ storeService: failingService });

    // when
    const result = await validate(INPUT);

    // then
    const [error] = result._unsafeUnwrapErr();
    expect(error.code).toBe("VALIDATE_WEBHOOK_SIGNATURE_ERROR");
    expect(error.details).toBeDefined();
  });
});
