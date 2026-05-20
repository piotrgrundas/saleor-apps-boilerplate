import { afterEach, beforeEach, describe, expect, vi } from "vite-plus/test";

import { it } from "@/lib/test/it";

import { createGraphqlClient } from "./client";

const URL = "https://api.example.com/graphql/";
const QUERY = "query GetUser($id: ID!) { user(id: $id) { id name } }";

const document = {
  toString: () => QUERY,
} as unknown as Parameters<ReturnType<typeof createGraphqlClient>["execute"]>[0];

const mockFetch = (impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) => {
  vi.stubGlobal("fetch", vi.fn(impl));
};

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

describe("createGraphqlClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns data on a 200 response", async ({ logger }) => {
    // given
    mockFetch(async () => jsonResponse({ data: { user: { id: "1", name: "Pete" } } }));
    const client = createGraphqlClient(URL, { logger });

    // when
    const result = await client.execute(document, { variables: { id: "1" } });

    // then
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toEqual({ user: { id: "1", name: "Pete" } });
  });

  it("attaches Authorization header when authToken is provided", async ({ logger }) => {
    // given
    let captured: Headers | undefined;
    mockFetch(async (_url, init) => {
      captured = new Headers(init?.headers);
      return jsonResponse({ data: {} });
    });
    const client = createGraphqlClient(URL, { logger });

    // when
    await client.execute(document, { authToken: "abc123" });

    // then
    expect(captured?.get("authorization")).toBe("Bearer abc123");
  });

  it("returns GRAPHQL_HTTP_ERROR on non-2xx response", async ({ logger }) => {
    // given
    mockFetch(async () => new Response("oops", { status: 500, statusText: "Internal" }));
    const client = createGraphqlClient(URL, { logger });

    // when
    const result = await client.execute(document);

    // then
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error[0].code).toBe("GRAPHQL_HTTP_ERROR");
  });

  it("returns GRAPHQL_INVALID_RESPONSE_ERROR when body is not valid JSON", async ({ logger }) => {
    // given
    mockFetch(
      async () =>
        new Response("not json", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const client = createGraphqlClient(URL, { logger });

    // when
    const result = await client.execute(document);

    // then
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error[0].code).toBe("GRAPHQL_INVALID_RESPONSE_ERROR");
  });

  it("returns GRAPHQL_RESPONSE_ERROR when body contains errors[]", async ({ logger }) => {
    // given
    mockFetch(async () =>
      jsonResponse({ errors: [{ message: "Field 'foo' not found", path: ["user"] }] }),
    );
    const client = createGraphqlClient(URL, { logger });

    // when
    const result = await client.execute(document);

    // then
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error[0].code).toBe("GRAPHQL_RESPONSE_ERROR");
      expect(result.error[0].message).toBe("Field 'foo' not found");
    }
  });

  it("returns GRAPHQL_REQUEST_ERROR on network failure", async ({ logger }) => {
    // given
    mockFetch(async () => {
      throw new Error("ECONNREFUSED");
    });
    const client = createGraphqlClient(URL, { logger });

    // when
    const result = await client.execute(document);

    // then
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error[0].code).toBe("GRAPHQL_REQUEST_ERROR");
  });

  it("returns GRAPHQL_TIMEOUT_ERROR when AbortSignal.timeout fires", async ({ logger }) => {
    // given — synthesize the TimeoutError that AbortSignal.timeout throws
    mockFetch(async () => {
      const e = new Error("The operation was aborted due to timeout");
      e.name = "TimeoutError";
      throw e;
    });
    const client = createGraphqlClient(URL, { logger, timeout: 50 });

    // when
    const result = await client.execute(document);

    // then
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error[0].code).toBe("GRAPHQL_TIMEOUT_ERROR");
  });
});
