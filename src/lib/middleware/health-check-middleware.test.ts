import { describe, expect, it } from "vite-plus/test";

import { createTestApp } from "@/lib/test/app";
import { createTestRequest } from "@/lib/test/request";
import { healthCheckMiddleware } from "./health-check-middleware";

function createApp() {
  const app = createTestApp();
  app.use("*", healthCheckMiddleware);
  app.all("*", (c) => c.text("next"));
  return app;
}

describe("healthCheckMiddleware", () => {
  it("returns status ok for GET /healthcheck", async () => {
    // given
    const app = createApp();

    // when
    const res = await app.request(createTestRequest("/healthcheck", { method: "GET" }));

    // then
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it.each([
    { desc: "non-healthcheck path", path: "/other", method: "GET" },
    { desc: "POST to /healthcheck", path: "/healthcheck", method: "POST" },
  ])("passes through for $desc", async ({ path, method }) => {
    // given
    const app = createApp();

    // when
    const res = await app.request(createTestRequest(path, { method }));

    // then
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("next");
  });
});
