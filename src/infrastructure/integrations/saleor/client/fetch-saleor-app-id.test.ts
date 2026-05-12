import { afterEach, describe, expect, vi } from "vite-plus/test";

import { it } from "@/lib/test/it";
import { createTestContext } from "@/lib/test/mock";

import { fetchSaleorAppId } from "./fetch-saleor-app-id";

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

describe("fetchSaleorAppId", () => {
  it("returns app id on success", async () => {
    // given
    mockFetch(jsonResponse({ data: { app: { id: "app-123" } } }));

    // when
    const result = await fetchSaleorAppId({ apiUrl: API_URL, token: TOKEN }, createTestContext());

    // then
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe("app-123");
  });

  it("sends correct request", async () => {
    // given
    mockFetch(jsonResponse({ data: { app: { id: "app-123" } } }));

    // when
    await fetchSaleorAppId({ apiUrl: API_URL, token: TOKEN }, createTestContext());

    // then
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe(API_URL);
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("returns SALEOR_REQUEST_ERROR on network error", async () => {
    // given
    mockFetchError(new Error("connection refused"));

    // when
    const result = await fetchSaleorAppId({ apiUrl: API_URL, token: TOKEN }, createTestContext());

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()[0].code).toBe("SALEOR_REQUEST_ERROR");
    expect(result._unsafeUnwrapErr()[0].message).toBe("connection refused");
  });

  it("returns SALEOR_REQUEST_ERROR on non-ok response", async () => {
    // given
    mockFetch(jsonResponse({}, 500));

    // when
    const result = await fetchSaleorAppId({ apiUrl: API_URL, token: TOKEN }, createTestContext());

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()[0].code).toBe("SALEOR_REQUEST_ERROR");
    expect(result._unsafeUnwrapErr()[0].message).toContain("500");
  });

  it("returns SALEOR_GRAPHQL_ERROR on graphql errors", async () => {
    // given
    mockFetch(jsonResponse({ errors: [{ message: "Permission denied" }] }));

    // when
    const result = await fetchSaleorAppId({ apiUrl: API_URL, token: TOKEN }, createTestContext());

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()[0].code).toBe("SALEOR_GRAPHQL_ERROR");
    expect(result._unsafeUnwrapErr()[0].message).toContain("Permission denied");
  });

  it("returns SALEOR_APP_NOT_FOUND_ERROR when app is null", async () => {
    // given
    mockFetch(jsonResponse({ data: { app: null } }));

    // when
    const result = await fetchSaleorAppId({ apiUrl: API_URL, token: TOKEN }, createTestContext());

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()[0].code).toBe("SALEOR_APP_NOT_FOUND_ERROR");
  });

  it("returns SALEOR_APP_NOT_FOUND_ERROR when data is missing", async () => {
    // given
    mockFetch(jsonResponse({}));

    // when
    const result = await fetchSaleorAppId({ apiUrl: API_URL, token: TOKEN }, createTestContext());

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()[0].code).toBe("SALEOR_APP_NOT_FOUND_ERROR");
  });
});
