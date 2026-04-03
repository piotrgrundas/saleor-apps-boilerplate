import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { err } from "neverthrow";

import type { JWKSService } from "@/application/domain/services/jwks-service";
import { createMockJwksService } from "@/lib/test/mock";
import { SaleorStoreService } from "./saleor-store-service";

const API_URL = "https://test.saleor.cloud/graphql/";
const TOKEN = "test-token";

let fetchSpy: ReturnType<typeof vi.spyOn>;

const mockFetch = (response: Response) => {
  fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
};

const mockFetchError = (error: Error) => {
  fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(error);
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  fetchSpy?.mockRestore();
});

describe("SaleorStoreService.getAppId", () => {
  it("returns app id on success", async () => {
    // given
    mockFetch(jsonResponse({ data: { app: { id: "app-123" } } }));
    const service = new SaleorStoreService(createMockJwksService());

    // when
    const result = await service.getAppId(API_URL, TOKEN);

    // then
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe("app-123");
  });

  it("sends correct request", async () => {
    // given
    mockFetch(jsonResponse({ data: { app: { id: "app-123" } } }));
    const service = new SaleorStoreService(createMockJwksService());

    // when
    await service.getAppId(API_URL, TOKEN);

    // then
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe(API_URL);
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("returns STORE_REQUEST_ERROR on network error", async () => {
    // given
    mockFetchError(new Error("connection refused"));
    const service = new SaleorStoreService(createMockJwksService());

    // when
    const result = await service.getAppId(API_URL, TOKEN);

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("STORE_REQUEST_ERROR");
    expect(result._unsafeUnwrapErr().message).toBe("connection refused");
  });

  it("returns STORE_REQUEST_ERROR on non-ok response", async () => {
    // given
    mockFetch(jsonResponse({}, 500));
    const service = new SaleorStoreService(createMockJwksService());

    // when
    const result = await service.getAppId(API_URL, TOKEN);

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("STORE_REQUEST_ERROR");
    expect(result._unsafeUnwrapErr().message).toContain("500");
  });

  it("returns STORE_GRAPHQL_ERROR on graphql errors", async () => {
    // given
    mockFetch(jsonResponse({ errors: [{ message: "Permission denied" }] }));
    const service = new SaleorStoreService(createMockJwksService());

    // when
    const result = await service.getAppId(API_URL, TOKEN);

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("STORE_GRAPHQL_ERROR");
    expect(result._unsafeUnwrapErr().message).toContain("Permission denied");
  });

  it("returns STORE_APP_NOT_FOUND_ERROR when app is null", async () => {
    // given
    mockFetch(jsonResponse({ data: { app: null } }));
    const service = new SaleorStoreService(createMockJwksService());

    // when
    const result = await service.getAppId(API_URL, TOKEN);

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("STORE_APP_NOT_FOUND_ERROR");
  });

  it("returns STORE_APP_NOT_FOUND_ERROR when data is missing", async () => {
    // given
    mockFetch(jsonResponse({}));
    const service = new SaleorStoreService(createMockJwksService());

    // when
    const result = await service.getAppId(API_URL, TOKEN);

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("STORE_APP_NOT_FOUND_ERROR");
  });
});

const validHeaders = {
  "saleor-domain": "my-store.saleor.cloud",
  "saleor-api-url": "https://my-store.saleor.cloud/graphql/",
  "saleor-event": "ORDER_CREATED",
  "saleor-signature": "valid-signature",
};

describe("SaleorStoreService.verifyWebhook", () => {
  it("returns webhook data on valid headers and signature", async () => {
    // given
    const service = new SaleorStoreService(createMockJwksService());

    // when
    const result = await service.verifyWebhook(validHeaders, "payload");

    // then
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      domain: "my-store.saleor.cloud",
      apiUrl: "https://my-store.saleor.cloud/graphql/",
      event: "ORDER_CREATED",
    });
  });

  it("returns STORE_WEBHOOK_HEADERS_ERROR when headers are missing", async () => {
    // given
    const service = new SaleorStoreService(createMockJwksService());

    // when
    const result = await service.verifyWebhook({}, "payload");

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("STORE_WEBHOOK_HEADERS_ERROR");
  });

  it("returns STORE_WEBHOOK_HEADERS_ERROR when api-url is invalid", async () => {
    // given
    const service = new SaleorStoreService(createMockJwksService());

    // when
    const result = await service.verifyWebhook(
      { ...validHeaders, "saleor-api-url": "not-a-url" },
      "payload",
    );

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("STORE_WEBHOOK_HEADERS_ERROR");
  });

  it("returns STORE_WEBHOOK_SIGNATURE_ERROR when signature verification fails", async () => {
    // given
    const failingJwks: JWKSService = {
      verify: async () =>
        err({ code: "JWKS_NO_MATCHING_KEY_ERROR" as const, message: "No matching key" }),
    };
    const service = new SaleorStoreService(failingJwks);

    // when
    const result = await service.verifyWebhook(validHeaders, "payload");

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("STORE_WEBHOOK_SIGNATURE_ERROR");
    expect(result._unsafeUnwrapErr().cause?.code).toBe("JWKS_NO_MATCHING_KEY_ERROR");
  });
});
