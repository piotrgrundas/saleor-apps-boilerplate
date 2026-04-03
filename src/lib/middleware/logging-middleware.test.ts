import type { Context } from "hono";
import { describe, expect, it } from "vite-plus/test";

import { createTestApp } from "@/lib/test/app";
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
    app.get("/test", (c) => c.text("ok"));

    // when
    await app.request(createTestRequest("/test", { method: "GET" }));

    // then
    expect(infoCalls).toHaveLength(2);
    expect(infoCalls[0].message).toContain("→ GET /test");
    expect(infoCalls[1].message).toContain("← GET /test");
    expect(infoCalls[1].meta?.status).toBe(200);
    expect(infoCalls[1].meta?.duration).toBeTypeOf("number");
  });

  it("sets logger in context", async () => {
    // given
    const { logger } = createSpyLogger();
    let contextLogger: unknown;
    const app = createTestApp();
    app.use("*", createLoggingMiddleware(logger));
    app.get("/test", (c: Context) => {
      contextLogger = c.get("logger");
      return c.text("ok");
    });

    // when
    await app.request(createTestRequest("/test", { method: "GET" }));

    // then
    expect(contextLogger).toBeDefined();
  });

  it.each([
    { desc: "x-request-id present", requestId: "req-123", expectedTag: "req-123" },
    { desc: "x-request-id missing", requestId: undefined, expectedTag: "no-request-id" },
  ])("tags logger with $desc", async ({ requestId, expectedTag }) => {
    // given
    const { logger, withTagCalls } = createSpyLogger();
    const app = createTestApp();
    app.use("*", createLoggingMiddleware(logger));
    app.get("/test", (c) => c.text("ok"));
    const headers: Record<string, string> = {};
    if (requestId) headers["x-request-id"] = requestId;

    // when
    await app.request(createTestRequest("/test", { headers }));

    // then
    expect(withTagCalls).toContain(expectedTag);
  });

  it("includes extra meta in log entries", async () => {
    // given
    const { logger, infoCalls } = createSpyLogger();
    const app = createTestApp();
    app.use("*", createLoggingMiddleware(logger, { appName: "test-app" }));
    app.get("/test", (c) => c.text("ok"));

    // when
    await app.request(createTestRequest("/test", { method: "GET" }));

    // then
    expect(infoCalls[0].meta?.appName).toBe("test-app");
    expect(infoCalls[1].meta?.appName).toBe("test-app");
  });
});
