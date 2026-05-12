import { err, ok } from "neverthrow";
import { describe, expect } from "vite-plus/test";
import { it } from "@/lib/test/it";

import type { ValidateWebhookInput, ValidateWebhookUseCase } from "@/application/validate-webhook-use-case";
import { BadRequestError, UnauthorizedError } from "@/lib/error/base";
import { createTestApp } from "@/lib/test/app";
import { createTestRequest } from "@/lib/test/request";
import { createStoreWebhookValidationMiddleware } from "./store-webhook-validation-middleware";

const validHeaders = {
  "saleor-domain": "my-store.saleor.cloud",
  "saleor-api-url": "https://my-store.saleor.cloud/graphql/",
  "saleor-event": "ORDER_CREATED",
  "saleor-signature": "valid-signature",
};

function createMockValidateWebhook(
  resultType: "ok" | "headers_error" | "signature_error" = "ok",
): ValidateWebhookUseCase {
  return async (_input: ValidateWebhookInput) => {
    if (resultType === "headers_error") {
      return err([
        {
          code: "VALIDATE_WEBHOOK_HEADERS_ERROR" as const,
          message: "Invalid webhook headers",
        },
      ]);
    }
    if (resultType === "signature_error") {
      return err([
        {
          code: "VALIDATE_WEBHOOK_SIGNATURE_ERROR" as const,
          message: "Invalid webhook signature",
        },
      ]);
    }
    return ok({
      domain: "my-store.saleor.cloud",
      apiUrl: "https://my-store.saleor.cloud/graphql/",
      event: "ORDER_CREATED",
    });
  };
}

function createApp(validateWebhook: ValidateWebhookUseCase) {
  const app = createTestApp();
  app.use("*", createStoreWebhookValidationMiddleware(validateWebhook));
  app.post("/webhook", (context) =>
    context.json({
      domain: context.get("saleorDomain"),
      apiUrl: context.get("saleorApiUrl"),
      event: context.get("saleorEvent"),
    }),
  );
  app.onError((error, context) => {
    if (error instanceof BadRequestError) {
      return context.json({ error: error.message }, 400);
    }
    if (error instanceof UnauthorizedError) {
      return context.json({ error: error.message }, 401);
    }
    return context.json({ error: "Internal Server Error" }, 500);
  });
  return app;
}

describe("createStoreWebhookValidationMiddleware", () => {
  it("sets context values for valid webhook request", async () => {
    // given
    const app = createApp(createMockValidateWebhook("ok"));

    // when
    const res = await app.request(
      createTestRequest("/webhook", {
        method: "POST",
        headers: validHeaders,
        body: JSON.stringify({ event: "order_created" }),
      }),
    );

    // then
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.domain).toBe("my-store.saleor.cloud");
    expect(body.apiUrl).toBe("https://my-store.saleor.cloud/graphql/");
    expect(body.event).toBe("ORDER_CREATED");
  });

  it("returns 400 when headers are invalid", async () => {
    // given
    const app = createApp(createMockValidateWebhook("headers_error"));

    // when
    const res = await app.request(
      createTestRequest("/webhook", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    // then
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid webhook headers");
  });

  it("returns 401 when signature verification fails", async () => {
    // given
    const app = createApp(createMockValidateWebhook("signature_error"));

    // when
    const res = await app.request(
      createTestRequest("/webhook", {
        method: "POST",
        headers: validHeaders,
        body: JSON.stringify({ event: "order_created" }),
      }),
    );

    // then
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid webhook signature");
  });
});
