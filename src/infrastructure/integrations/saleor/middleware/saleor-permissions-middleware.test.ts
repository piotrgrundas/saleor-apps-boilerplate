import { err, ok } from "neverthrow";
import { describe, expect } from "vite-plus/test";

import { createTestApp } from "@/lib/test/app";
import { it } from "@/lib/test/it";
import { createTestRequest } from "@/lib/test/request";

import { saleorPermissionsMiddleware } from "./saleor-permissions-middleware";

const VALID_HEADERS = {
  "authorization-bearer": "valid-token",
  "saleor-api-url": "https://shop.example.com/graphql/",
};

describe("saleorPermissionsMiddleware", () => {
  it("returns 200 when all required permissions are present", async ({ joseAuthService }) => {
    // given
    joseAuthService.verifyJWT = async () => ok({ permissions: ["MANAGE_PRODUCTS"] });
    const app = createTestApp();
    app.use(
      "*",
      saleorPermissionsMiddleware({
        joseAuthService,
        required: ["MANAGE_PRODUCTS"],
      }),
    );
    app.get("/admin", (context) => context.text("ok"));

    // when
    const response = await app.request(
      createTestRequest("/admin", { method: "GET", headers: VALID_HEADERS }),
    );

    // then
    expect(response.status).toBe(200);
  });

  it("returns 401 when authorization-bearer header is missing", async ({ joseAuthService }) => {
    // given
    const app = createTestApp();
    app.use("*", saleorPermissionsMiddleware({ joseAuthService, required: ["MANAGE_PRODUCTS"] }));
    app.get("/admin", (context) => context.text("ok"));

    // when
    const response = await app.request(
      createTestRequest("/admin", {
        method: "GET",
        headers: { "saleor-api-url": VALID_HEADERS["saleor-api-url"] },
      }),
    );

    // then
    expect(response.status).toBe(401);
  });

  it("returns 401 when saleor-api-url header is missing", async ({ joseAuthService }) => {
    // given
    const app = createTestApp();
    app.use("*", saleorPermissionsMiddleware({ joseAuthService, required: ["MANAGE_PRODUCTS"] }));
    app.get("/admin", (context) => context.text("ok"));

    // when
    const response = await app.request(
      createTestRequest("/admin", {
        method: "GET",
        headers: { "authorization-bearer": VALID_HEADERS["authorization-bearer"] },
      }),
    );

    // then
    expect(response.status).toBe(401);
  });

  it("returns 401 when JWT verification fails", async ({ joseAuthService }) => {
    // given
    joseAuthService.verifyJWT = async () =>
      err([{ code: "JWT_VERIFICATION_ERROR", message: "bad signature" }]);
    const app = createTestApp();
    app.use("*", saleorPermissionsMiddleware({ joseAuthService, required: ["MANAGE_PRODUCTS"] }));
    app.get("/admin", (context) => context.text("ok"));

    // when
    const response = await app.request(
      createTestRequest("/admin", { method: "GET", headers: VALID_HEADERS }),
    );

    // then
    expect(response.status).toBe(401);
  });

  it("returns 403 when JWT lacks a required permission", async ({ joseAuthService }) => {
    // given
    joseAuthService.verifyJWT = async () => ok({ permissions: ["MANAGE_ORDERS"] });
    const app = createTestApp();
    app.use(
      "*",
      saleorPermissionsMiddleware({
        joseAuthService,
        required: ["MANAGE_PRODUCTS", "MANAGE_ORDERS"],
      }),
    );
    app.get("/admin", (context) => context.text("ok"));

    // when
    const response = await app.request(
      createTestRequest("/admin", { method: "GET", headers: VALID_HEADERS }),
    );

    // then
    expect(response.status).toBe(403);
  });

  it("returns 403 when permissions claim is missing entirely", async ({ joseAuthService }) => {
    // given
    joseAuthService.verifyJWT = async () => ok({});
    const app = createTestApp();
    app.use("*", saleorPermissionsMiddleware({ joseAuthService, required: ["MANAGE_PRODUCTS"] }));
    app.get("/admin", (context) => context.text("ok"));

    // when
    const response = await app.request(
      createTestRequest("/admin", { method: "GET", headers: VALID_HEADERS }),
    );

    // then
    expect(response.status).toBe(403);
  });
});
