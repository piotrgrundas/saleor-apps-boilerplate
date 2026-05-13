import type { Context } from "hono";
import { describe, expect } from "vite-plus/test";

import { createTestApp } from "@/lib/test/app";
import { it } from "@/lib/test/it";
import { createMockLogger } from "@/lib/test/mock";
import { createTestRequest } from "@/lib/test/request";

import { createLoggingMiddleware } from "./logging-middleware";

function createSpyLogger() {
  const infoCalls: Array<{ message: string; meta?: Record<string, unknown> }> = [];

  const withTagCalls: string[] = [];
  const logger = createMockLogger();

  logger.info = (message, meta) => {
    infoCalls.push({ message, meta });
  };
  logger.withTag = (tag: string) => {
    withTagCalls.push(tag);
    return logger;
  };

  return { logger, infoCalls, withTagCalls };
}

describe("createLoggingMiddleware", () => {
  it("logs request entry and response exit", async () => {
    // given
    const { logger, infoCalls } = createSpyLogger();
    const app = createTestApp();
    app.use("*", createLoggingMiddleware(logger));
    app.get("/test", (context) => context.text("ok"));

    // when
    await app.request(createTestRequest("/test", { method: "GET" }));

    // then
    expect(infoCalls).toHaveLength(2);
    expect(infoCalls[0].message).toBe("GET ⇒ /test");
    expect(infoCalls[1].message).toMatch(/^GET ⇐ 200 \(\d+ms\) \/test$/);
  });

  it("sets logger in context", async () => {
    // given
    const { logger } = createSpyLogger();
    let contextLogger: unknown;
    const app = createTestApp();
    app.use("*", createLoggingMiddleware(logger));
    app.get("/test", (context: Context) => {
      contextLogger = context.get("logger");
      return context.text("ok");
    });

    // when
    await app.request(createTestRequest("/test", { method: "GET" }));

    // then
    expect(contextLogger).toBeDefined();
  });

  it.each([
    { desc: "favicon.ico", path: "/favicon.ico" },
    { desc: "assets path", path: "/assets/main.css" },
    { desc: "static path", path: "/static/logo.png" },
    { desc: "js file", path: "/app.js" },
  ])("skips logging for $desc", async ({ path }) => {
    // given
    const { logger, infoCalls } = createSpyLogger();
    const app = createTestApp();
    app.use("*", createLoggingMiddleware(logger));
    app.get(path, (context) => context.text("ok"));

    // when
    await app.request(createTestRequest(path, { method: "GET" }));

    // then
    expect(infoCalls).toHaveLength(0);
  });

  it("respects custom skip predicate", async () => {
    // given
    const { logger, infoCalls } = createSpyLogger();
    const app = createTestApp();
    app.use(
      "*",
      createLoggingMiddleware(logger, {
        skip: (context) => context.req.path.startsWith("/health"),
      }),
    );
    app.get("/health", (context) => context.text("ok"));

    // when
    await app.request(createTestRequest("/health", { method: "GET" }));

    // then
    expect(infoCalls).toHaveLength(0);
  });
});
