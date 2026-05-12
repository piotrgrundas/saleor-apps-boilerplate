import { afterEach, describe, expect, vi } from "vite-plus/test";
import { it } from "@/lib/test/it";

import { createJoseJWKSRepository } from "./jose-jwks-repository";

const DOMAIN = "test.saleor.cloud";
const JWKS_URL = `https://${DOMAIN}/.well-known/jwks.json`;

const TEST_KEYS: JsonWebKey[] = [{ kty: "RSA", n: "test-n", e: "AQAB" }];

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

describe("createJoseJWKSRepository", () => {
  it("fetches and returns keys", async () => {
    // given
    mockFetch(jsonResponse({ keys: TEST_KEYS }));
    const repo = createJoseJWKSRepository();

    // when
    const result = await repo.getKeys({ saleorDomain: DOMAIN });

    // then
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(TEST_KEYS);
  });

  it("caches keys on subsequent calls", async () => {
    // given
    mockFetch(jsonResponse({ keys: TEST_KEYS }));
    const repo = createJoseJWKSRepository();

    // when
    await repo.getKeys({ saleorDomain: DOMAIN });
    await repo.getKeys({ saleorDomain: DOMAIN });

    // then
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("bypasses cache when forceRefresh is true", async () => {
    // given
    mockFetch(jsonResponse({ keys: TEST_KEYS }));
    const repo = createJoseJWKSRepository();

    // when
    await repo.getKeys({ saleorDomain: DOMAIN });
    await repo.getKeys({ saleorDomain: DOMAIN, forceRefresh: true });

    // then
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("returns JWKS_FETCH_ERROR on non-ok response", async () => {
    // given
    mockFetch(jsonResponse({}, 500));
    const repo = createJoseJWKSRepository();

    // when
    const result = await repo.getKeys({ saleorDomain: DOMAIN });

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()[0].code).toBe("JWKS_FETCH_ERROR");
    expect(result._unsafeUnwrapErr()[0].message).toContain("500");
  });

  it("returns JWKS_FETCH_ERROR on network error", async () => {
    // given
    mockFetchError(new Error("DNS resolution failed"));
    const repo = createJoseJWKSRepository();

    // when
    const result = await repo.getKeys({ saleorDomain: DOMAIN });

    // then
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()[0].code).toBe("JWKS_FETCH_ERROR");
    expect(result._unsafeUnwrapErr()[0].message).toContain("DNS resolution failed");
  });

  it("does not cache failed results", async () => {
    // given
    mockFetch(jsonResponse({}, 500));
    const repo = createJoseJWKSRepository();
    await repo.getKeys({ saleorDomain: DOMAIN });

    // when
    mockFetch(jsonResponse({ keys: TEST_KEYS }));
    const result = await repo.getKeys({ saleorDomain: DOMAIN });

    // then
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(TEST_KEYS);
  });

  it("fetches from correct URL", async () => {
    // given
    mockFetch(jsonResponse({ keys: [] }));
    const repo = createJoseJWKSRepository();

    // when
    await repo.getKeys({ saleorDomain: DOMAIN });

    // then
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe(JWKS_URL);
  });
});
