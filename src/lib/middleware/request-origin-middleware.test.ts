import { describe, expect, it } from "vite-plus/test";

import { createTestApp } from "@/lib/test/app";
import { createTestRequest } from "@/lib/test/request";
import { requestOriginMiddleware } from "./request-origin-middleware";

function createApp() {
  const app = createTestApp();
  app.use("*", requestOriginMiddleware);
  app.get("*", (c) => c.text(c.get("origin")));
  return app;
}

describe("requestOriginMiddleware", () => {
  it.each([
    {
      desc: "both headers present",
      headers: { "x-forwarded-proto": "https", host: "my-app.example.com" },
      expected: "https://my-app.example.com",
    },
    {
      desc: "missing x-forwarded-proto defaults to https",
      headers: { host: "my-app.example.com" },
      expected: "https://my-app.example.com",
    },
    {
      desc: "missing host defaults to localhost",
      headers: { "x-forwarded-proto": "http" },
      expected: "http://localhost",
    },
    {
      desc: "http proto with port",
      headers: { "x-forwarded-proto": "http", host: "localhost:3000" },
      expected: "http://localhost:3000",
    },
  ])("builds origin when $desc", async ({ headers, expected }) => {
    // given
    const app = createApp();

    // when
    const res = await app.request(
      createTestRequest("/test", { headers: headers as Record<string, string> }),
    );

    // then
    expect(await res.text()).toBe(expected);
  });
});
