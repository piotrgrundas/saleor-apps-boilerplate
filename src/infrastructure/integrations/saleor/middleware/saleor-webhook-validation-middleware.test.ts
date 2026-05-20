import { err, ok } from "neverthrow";
import { describe, expect } from "vite-plus/test";

import { createTestApp } from "@/lib/test/app";
import { it } from "@/lib/test/it";
import { createTestRequest } from "@/lib/test/request";

import { saleorWebhookValidationMiddleware } from "./saleor-webhook-validation-middleware";

const VALID_HEADERS = {
  "saleor-domain": "shop.example.com",
  "saleor-api-url": "https://shop.example.com/graphql/",
  "saleor-event": "product_updated",
  "saleor-signature": "valid-jws",
};

const VALID_BODY = JSON.stringify({ event: { id: "abc" } });

describe("saleorWebhookValidationMiddleware", () => {
  it("returns 200 when signature + headers + body are valid", async ({
    joseAuthService,
    joseAuthServiceProvider,
  }) => {
    // given
    joseAuthService.verifyJWSDetached = async () => ok(undefined);
    const app = createTestApp();
    app.use(
      "/webhook",
      saleorWebhookValidationMiddleware({ joseAuthService: joseAuthServiceProvider }),
    );
    app.post("/webhook", (context) => context.text("ok"));

    // when
    const response = await app.request(
      createTestRequest("/webhook", {
        method: "POST",
        headers: VALID_HEADERS,
        body: VALID_BODY,
      }),
    );

    // then
    expect(response.status).toBe(200);
  });

  it("returns 400 when required headers are missing", async ({ joseAuthServiceProvider }) => {
    // given
    const app = createTestApp();
    app.use(
      "/webhook",
      saleorWebhookValidationMiddleware({ joseAuthService: joseAuthServiceProvider }),
    );
    app.post("/webhook", (context) => context.text("ok"));

    // when — only sending some headers
    const response = await app.request(
      createTestRequest("/webhook", {
        method: "POST",
        headers: { "saleor-domain": "shop.example.com" },
        body: VALID_BODY,
      }),
    );

    // then
    expect(response.status).toBe(400);
  });

  it("returns 401 when JWS signature verification fails", async ({
    joseAuthService,
    joseAuthServiceProvider,
  }) => {
    // given
    joseAuthService.verifyJWSDetached = async () =>
      err([{ code: "JWKS_FETCH_ERROR", message: "bad signature" }]);
    const app = createTestApp();
    app.use(
      "/webhook",
      saleorWebhookValidationMiddleware({ joseAuthService: joseAuthServiceProvider }),
    );
    app.post("/webhook", (context) => context.text("ok"));

    // when
    const response = await app.request(
      createTestRequest("/webhook", {
        method: "POST",
        headers: VALID_HEADERS,
        body: VALID_BODY,
      }),
    );

    // then
    expect(response.status).toBe(401);
  });

  it("returns 400 when body envelope is invalid", async ({
    joseAuthService,
    joseAuthServiceProvider,
  }) => {
    // given
    joseAuthService.verifyJWSDetached = async () => ok(undefined);
    const app = createTestApp();
    app.use(
      "/webhook",
      saleorWebhookValidationMiddleware({ joseAuthService: joseAuthServiceProvider }),
    );
    app.post("/webhook", (context) => context.text("ok"));

    // when — body missing `event` key
    const response = await app.request(
      createTestRequest("/webhook", {
        method: "POST",
        headers: VALID_HEADERS,
        body: JSON.stringify({}),
      }),
    );

    // then
    expect(response.status).toBe(400);
  });
});
