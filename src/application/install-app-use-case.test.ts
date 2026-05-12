import { err, ok } from "neverthrow";
import { describe, expect } from "vite-plus/test";
import { it } from "@/lib/test/it";

import type { AppConfigRepository } from "@/domain/ports/app-config-repository";
import type { JWKSRepository } from "@/domain/ports/jwks-repository";
import type { StoreService } from "@/domain/ports/store-service";
import {
  createMockAppConfigRepository,
  createMockJwksRepository,
  createMockLogger,
  createMockStoreService,
} from "@/lib/test/mock";
import { installAppUseCase } from "./install-app-use-case";

const INPUT = {
  saleorDomain: "test.saleor.cloud",
  saleorApiUrl: "https://test.saleor.cloud/graphql/",
  authToken: "test-token",
  allowedDomains: ["*.saleor.cloud"],
};

describe("installAppUseCase", () => {
  it("installs app successfully", async () => {
    // given
    const install = installAppUseCase({
      appConfigRepository: createMockAppConfigRepository(),
      storeService: createMockStoreService("app-123"),
      jwksRepository: createMockJwksRepository(),
      logger: createMockLogger(),
    });

    // when
    const result = await install(INPUT);

    // then
    expect(result.isOk()).toBe(true);
  });

  it("saves config with correct data", async () => {
    // given
    const configRepo = createMockAppConfigRepository();
    const install = installAppUseCase({
      appConfigRepository: configRepo,
      storeService: createMockStoreService("app-123"),
      jwksRepository: createMockJwksRepository(),
      logger: createMockLogger(),
    });

    // when
    await install(INPUT);

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

  it("returns INSTALL_APP_DOMAIN_NOT_ALLOWED_ERROR when domain is not allowed", async () => {
    // given
    const install = installAppUseCase({
      appConfigRepository: createMockAppConfigRepository(),
      storeService: createMockStoreService("app-123"),
      jwksRepository: createMockJwksRepository(),
      logger: createMockLogger(),
    });

    // when
    const result = await install({
      ...INPUT,
      saleorDomain: "evil.example.com",
    });

    // then
    const [error] = result._unsafeUnwrapErr();
    expect(error.code).toBe("INSTALL_APP_DOMAIN_NOT_ALLOWED_ERROR");
    expect(error.details).toBeUndefined();
  });

  it("returns INSTALL_APP_FETCH_ID_ERROR when store service fails", async () => {
    // given
    const failingService: StoreService = {
      ...createMockStoreService(),
      getAppId: async () =>
        err([{ code: "STORE_REQUEST_ERROR", message: "connection refused" }]),
    };
    const install = installAppUseCase({
      appConfigRepository: createMockAppConfigRepository(),
      storeService: failingService,
      jwksRepository: createMockJwksRepository(),
      logger: createMockLogger(),
    });

    // when
    const result = await install(INPUT);

    // then
    const [error] = result._unsafeUnwrapErr();
    expect(error.code).toBe("INSTALL_APP_FETCH_ID_ERROR");
    expect((error.details as { cause: unknown }).cause).toEqual([
      { code: "STORE_REQUEST_ERROR", message: "connection refused" },
    ]);
  });

  it("returns INSTALL_APP_SAVE_CONFIG_ERROR when config save fails", async () => {
    // given
    const failingRepo: AppConfigRepository = {
      get: async () => ok(null),
      set: async () =>
        err([{ code: "APP_CONFIG_WRITE_ERROR", message: "write failed" }]),
      delete: async () => ok(undefined),
    };
    const install = installAppUseCase({
      appConfigRepository: failingRepo,
      storeService: createMockStoreService(),
      jwksRepository: createMockJwksRepository(),
      logger: createMockLogger(),
    });

    // when
    const result = await install(INPUT);

    // then
    const [error] = result._unsafeUnwrapErr();
    expect(error.code).toBe("INSTALL_APP_SAVE_CONFIG_ERROR");
    expect((error.details as { cause: unknown }).cause).toEqual([
      { code: "APP_CONFIG_WRITE_ERROR", message: "write failed" },
    ]);
  });

  it("returns INSTALL_APP_JWKS_PREFETCH_ERROR when jwks prefetch fails", async () => {
    // given
    const failingJwks: JWKSRepository = {
      getKeys: async () => err([{ code: "JWKS_FETCH_ERROR", message: "fetch failed" }]),
    };
    const install = installAppUseCase({
      appConfigRepository: createMockAppConfigRepository(),
      storeService: createMockStoreService(),
      jwksRepository: failingJwks,
      logger: createMockLogger(),
    });

    // when
    const result = await install(INPUT);

    // then
    const [error] = result._unsafeUnwrapErr();
    expect(error.code).toBe("INSTALL_APP_JWKS_PREFETCH_ERROR");
    expect((error.details as { cause: unknown }).cause).toEqual([
      { code: "JWKS_FETCH_ERROR", message: "fetch failed" },
    ]);
  });
});
