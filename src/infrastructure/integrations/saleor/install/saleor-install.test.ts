import { err, ok } from "neverthrow";
import { describe, expect } from "vite-plus/test";

import type {
  AppConfigRepository,
  AppConfigRepositoryProvider,
} from "@/domain/ports/app-config-repository";
import type { JWKSRepositoryProvider } from "@/domain/ports/jwks-repository";
import type { FetchSaleorAppId } from "@/infrastructure/integrations/saleor/client/fetch-saleor-app-id";
import { it } from "@/lib/test/it";
import {
  createMockAppConfigRepository,
  createMockJwksRepository,
  createTestContext,
} from "@/lib/test/mock";

import { createSaleorInstall } from "./saleor-install";

const INPUT = {
  saleorDomain: "test.saleor.cloud",
  saleorApiUrl: "https://test.saleor.cloud/graphql/",
  authToken: "test-token",
  allowedDomains: ["*.saleor.cloud"],
};

const okAppId =
  (appId = "test-app-id"): FetchSaleorAppId =>
  async () =>
    ok(appId);

const repoProvider =
  (repo: AppConfigRepository): AppConfigRepositoryProvider =>
  () =>
    repo;

const jwksProvider =
  (jwks: ReturnType<typeof createMockJwksRepository>): JWKSRepositoryProvider =>
  () =>
    jwks;

describe("createSaleorInstall", () => {
  it("installs app successfully", async () => {
    // given
    const install = createSaleorInstall({
      appConfigRepository: repoProvider(createMockAppConfigRepository()),
      fetchAppId: okAppId("app-123"),
      jwksRepository: jwksProvider(createMockJwksRepository()),
    });

    // when
    const result = await install(INPUT, createTestContext());

    // then
    expect(result.isOk()).toBe(true);
  });

  it("saves config with correct data", async () => {
    // given
    const configRepo = createMockAppConfigRepository();
    const install = createSaleorInstall({
      appConfigRepository: repoProvider(configRepo),
      fetchAppId: okAppId("app-123"),
      jwksRepository: jwksProvider(createMockJwksRepository()),
    });

    // when
    await install(INPUT, createTestContext());

    // then
    const saved = await configRepo.get(INPUT.saleorDomain);
    expect(saved.isOk()).toBe(true);
    expect(saved._unsafeUnwrap()).toEqual({
      saleorDomain: INPUT.saleorDomain,
      authToken: INPUT.authToken,
      saleorAppId: "app-123",
      saleorApiUrl: INPUT.saleorApiUrl,
    });
  });

  it("returns SALEOR_INSTALL_DOMAIN_NOT_ALLOWED_ERROR when domain is not allowed", async () => {
    // given
    const install = createSaleorInstall({
      appConfigRepository: repoProvider(createMockAppConfigRepository()),
      fetchAppId: okAppId("app-123"),
      jwksRepository: jwksProvider(createMockJwksRepository()),
    });

    // when
    const result = await install(
      {
        ...INPUT,
        saleorDomain: "evil.example.com",
      },
      createTestContext(),
    );

    // then
    const [error] = result._unsafeUnwrapErr();
    expect(error.code).toBe("SALEOR_INSTALL_DOMAIN_NOT_ALLOWED_ERROR");
    expect(error.details).toBeUndefined();
  });

  it("returns SALEOR_INSTALL_FETCH_ID_ERROR when fetch fails", async () => {
    // given
    const failingFetch: FetchSaleorAppId = async () =>
      err([{ code: "SALEOR_REQUEST_ERROR", message: "connection refused" }]);
    const install = createSaleorInstall({
      appConfigRepository: repoProvider(createMockAppConfigRepository()),
      fetchAppId: failingFetch,
      jwksRepository: jwksProvider(createMockJwksRepository()),
    });

    // when
    const result = await install(INPUT, createTestContext());

    // then
    const [error] = result._unsafeUnwrapErr();
    expect(error.code).toBe("SALEOR_INSTALL_FETCH_ID_ERROR");
    expect((error.details as { cause: unknown }).cause).toEqual([
      { code: "SALEOR_REQUEST_ERROR", message: "connection refused" },
    ]);
  });

  it("returns SALEOR_INSTALL_SAVE_CONFIG_ERROR when config save fails", async () => {
    // given
    const failingRepo: AppConfigRepository = {
      get: async () => ok(null),
      set: async () => err([{ code: "APP_CONFIG_WRITE_ERROR", message: "write failed" }]),
      delete: async () => ok(undefined),
    };
    const install = createSaleorInstall({
      appConfigRepository: repoProvider(failingRepo),
      fetchAppId: okAppId(),
      jwksRepository: jwksProvider(createMockJwksRepository()),
    });

    // when
    const result = await install(INPUT, createTestContext());

    // then
    const [error] = result._unsafeUnwrapErr();
    expect(error.code).toBe("SALEOR_INSTALL_SAVE_CONFIG_ERROR");
    expect((error.details as { cause: unknown }).cause).toEqual([
      { code: "APP_CONFIG_WRITE_ERROR", message: "write failed" },
    ]);
  });

  it("returns SALEOR_INSTALL_JWKS_PREFETCH_ERROR when jwks prefetch fails", async () => {
    // given
    const failingJwks: JWKSRepositoryProvider = () => ({
      get: async () => err([{ code: "JWKS_FETCH_ERROR", message: "fetch failed" }]),
      set: async () => ok(undefined),
    });
    const install = createSaleorInstall({
      appConfigRepository: repoProvider(createMockAppConfigRepository()),
      fetchAppId: okAppId(),
      jwksRepository: failingJwks,
    });

    // when
    const result = await install(INPUT, createTestContext());

    // then
    const [error] = result._unsafeUnwrapErr();
    expect(error.code).toBe("SALEOR_INSTALL_JWKS_PREFETCH_ERROR");
    expect((error.details as { cause: unknown }).cause).toEqual([
      { code: "JWKS_FETCH_ERROR", message: "fetch failed" },
    ]);
  });
});
