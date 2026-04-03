import { err } from "neverthrow";
import { describe, expect, it } from "vite-plus/test";

import type { StoreService } from "@/application/domain/services/store-service";
import { createMockStoreService } from "@/lib/test/mock";
import { ValidateWebhookUseCase } from "./validate-webhook-use-case";

const INPUT = {
  headers: {
    "saleor-domain": "test.saleor.cloud",
    "saleor-api-url": "https://test.saleor.cloud/graphql/",
    "saleor-event": "PRODUCT_UPDATED",
    "saleor-signature": "valid-signature",
  },
  body: '{"event":"product_updated"}',
};

describe("ValidateWebhookUseCase", () => {
  it("returns validated webhook data on success", async () => {
    // given
    const useCase = new ValidateWebhookUseCase(createMockStoreService());

    // when
    const result = await useCase.execute(INPUT);

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
        err({ code: "STORE_WEBHOOK_HEADERS_ERROR" as const, message: "Invalid webhook headers" }),
    };
    const useCase = new ValidateWebhookUseCase(failingService);

    // when
    const result = await useCase.execute({ headers: {}, body: "" });

    // then
    const error = result._unsafeUnwrapErr();
    expect(error.code).toBe("VALIDATE_WEBHOOK_HEADERS_ERROR");
    expect(error.cause).toEqual({
      code: "STORE_WEBHOOK_HEADERS_ERROR",
      message: "Invalid webhook headers",
    });
  });

  it("returns VALIDATE_WEBHOOK_SIGNATURE_ERROR when verification fails", async () => {
    // given
    const failingService: StoreService = {
      ...createMockStoreService(),
      verifyWebhook: async () =>
        err({
          code: "STORE_WEBHOOK_SIGNATURE_ERROR" as const,
          message: "Invalid webhook signature",
          cause: { code: "JWKS_NO_MATCHING_KEY_ERROR" as const, message: "No matching key" },
        }),
    };
    const useCase = new ValidateWebhookUseCase(failingService);

    // when
    const result = await useCase.execute(INPUT);

    // then
    const error = result._unsafeUnwrapErr();
    expect(error.code).toBe("VALIDATE_WEBHOOK_SIGNATURE_ERROR");
    expect(error.cause?.code).toBe("STORE_WEBHOOK_SIGNATURE_ERROR");
  });
});
