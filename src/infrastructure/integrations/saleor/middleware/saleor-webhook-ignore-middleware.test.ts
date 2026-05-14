import { describe, expect } from "vite-plus/test";

import { createTestApp } from "@/lib/test/app";
import { it } from "@/lib/test/it";
import { createMockLogger } from "@/lib/test/mock";
import { createTestRequest } from "@/lib/test/request";

import { saleorWebhookIgnoreMiddleware } from "./saleor-webhook-ignore-middleware";

function createSpyLogger() {
  const errorCalls: Array<{ message: string; meta?: Record<string, unknown> }> = [];
  const debugCalls: Array<{ message: string; meta?: Record<string, unknown> }> = [];
  const logger = createMockLogger();
  logger.error = (message, meta) => {
    errorCalls.push({ message, meta });
  };
  logger.debug = (message, meta) => {
    debugCalls.push({ message, meta });
  };
  return { logger, errorCalls, debugCalls };
}

const post = (body: unknown) =>
  createTestRequest("/webhook", {
    method: "POST",
    body: JSON.stringify(body),
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const construct = (options: any) => () => saleorWebhookIgnoreMiddleware(options);

describe("saleorWebhookIgnoreMiddleware", () => {
  it("throws at construction when both options are empty", () => {
    // given / when / then
    expect(construct({})).toThrow(/non-empty/);
    expect(construct({ appIdentifiers: [], userEmails: [] })).toThrow(/non-empty/);
  });

  it("ignores webhook when App identifier matches", async () => {
    // given
    const { logger, debugCalls } = createSpyLogger();
    const app = createTestApp();
    app.use("*", async (context, next) => {
      context.set("logger", logger);
      await next();
    });
    app.use("/webhook", saleorWebhookIgnoreMiddleware({ appIdentifiers: ["self.app"] }));
    let handlerCalled = false;
    app.post("/webhook", (context) => {
      handlerCalled = true;
      return context.text("handled");
    });

    // when
    const response = await app.request(
      post({ event: { issuingPrincipal: { __typename: "App", identifier: "self.app" } } }),
    );

    // then
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ignored: true });
    expect(handlerCalled).toBe(false);
    expect(debugCalls).toHaveLength(1);
  });

  it("ignores webhook when User email matches", async () => {
    // given
    const { logger } = createSpyLogger();
    const app = createTestApp();
    app.use("*", async (context, next) => {
      context.set("logger", logger);
      await next();
    });
    app.use("/webhook", saleorWebhookIgnoreMiddleware({ userEmails: ["bot@example.com"] }));
    let handlerCalled = false;
    app.post("/webhook", (context) => {
      handlerCalled = true;
      return context.text("handled");
    });

    // when
    const response = await app.request(
      post({ event: { issuingPrincipal: { __typename: "User", email: "bot@example.com" } } }),
    );

    // then
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ignored: true });
    expect(handlerCalled).toBe(false);
  });

  it("calls next when principal does not match", async () => {
    // given
    const { logger } = createSpyLogger();
    const app = createTestApp();
    app.use("*", async (context, next) => {
      context.set("logger", logger);
      await next();
    });
    app.use("/webhook", saleorWebhookIgnoreMiddleware({ appIdentifiers: ["self.app"] }));
    let handlerCalled = false;
    app.post("/webhook", (context) => {
      handlerCalled = true;
      return context.text("handled");
    });

    // when
    const response = await app.request(
      post({ event: { issuingPrincipal: { __typename: "App", identifier: "other.app" } } }),
    );

    // then
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("handled");
    expect(handlerCalled).toBe(true);
  });

  it("logs error and calls next when issuingPrincipal is missing", async () => {
    // given
    const { logger, errorCalls } = createSpyLogger();
    const app = createTestApp();
    app.use("*", async (context, next) => {
      context.set("logger", logger);
      await next();
    });
    app.use("/webhook", saleorWebhookIgnoreMiddleware({ appIdentifiers: ["self.app"] }));
    let handlerCalled = false;
    app.post("/webhook", (context) => {
      handlerCalled = true;
      return context.text("handled");
    });

    // when
    const response = await app.request(post({ event: {} }));

    // then
    expect(response.status).toBe(200);
    expect(handlerCalled).toBe(true);
    expect(errorCalls).toHaveLength(1);
    expect(errorCalls[0].message).toMatch(/issuingPrincipal/);
    expect(errorCalls[0].meta?.path).toBe("/webhook");
  });

  it("supports both lists together", async () => {
    // given
    const { logger } = createSpyLogger();
    const app = createTestApp();
    app.use("*", async (context, next) => {
      context.set("logger", logger);
      await next();
    });
    app.use(
      "/webhook",
      saleorWebhookIgnoreMiddleware({
        appIdentifiers: ["self.app"],
        userEmails: ["bot@example.com"],
      }),
    );
    app.post("/webhook", (context) => context.text("handled"));

    // when — User match short-circuits even with App list present
    const response = await app.request(
      post({ event: { issuingPrincipal: { __typename: "User", email: "bot@example.com" } } }),
    );

    // then
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ignored: true });
  });
});
