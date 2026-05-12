import { describe, expect } from "vite-plus/test";
import { it } from "@/lib/test/it";
import { z } from "zod";

import { ValidationError } from "@/lib/error/base";
import { createTestApp } from "@/lib/test/app";
import { createTestRequest } from "@/lib/test/request";
import { zodValidatorMiddleware } from "./zod-validator-middleware";

function createApp() {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  const app = createTestApp();
  app.post("/test", zodValidatorMiddleware("json", schema), (context) => context.json({ ok: true }));
  app.onError((err, context) => {
    if (err instanceof ValidationError) {
      return context.json({ error: "Validation failed", details: err.details }, 400);
    }
    return context.json({ error: "Unknown" }, 500);
  });

  return app;
}

describe("zodValidatorMiddleware", () => {
  it("passes valid json body through", async () => {
    // given
    const app = createApp();

    // when
    const res = await app.request(
      createTestRequest("/test", {
        method: "POST",
        body: JSON.stringify({ name: "Alice", age: 30 }),
      }),
    );

    // then
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it.each([
    { desc: "invalid field values", body: { name: "", age: -5 } },
    { desc: "missing required fields", body: {} },
  ])("throws ValidationError for $desc", async ({ body }) => {
    // given
    const app = createApp();

    // when
    const res = await app.request(
      createTestRequest("/test", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

    // then
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(json.details).toBeDefined();
  });

  it("validates query params", async () => {
    // given
    const querySchema = z.object({ page: z.string().min(1) });
    const app = createTestApp();
    app.get("/test", zodValidatorMiddleware("query", querySchema), (context) => context.json({ ok: true }));
    app.onError((err, context) => {
      if (err instanceof ValidationError) {
        return context.json({ error: "Validation failed" }, 400);
      }
      return context.json({ error: "Unknown" }, 500);
    });

    // when & then
    const validRes = await app.request(createTestRequest("/test?page=1", { method: "GET" }));
    expect(validRes.status).toBe(200);

    const invalidRes = await app.request(createTestRequest("/test", { method: "GET" }));
    expect(invalidRes.status).toBe(400);
  });
});
