import { err, ok } from "neverthrow";
import { describe, expect, it } from "vite-plus/test";

import type { AppConfigRepository } from "@/application/domain/repositories/app-config-repository";
import type { JWKSRepository } from "@/application/domain/repositories/jwks-repository";
import type { StoreService } from "@/application/domain/services/store-service";
import {
  createMockAppConfigRepository,
  createMockJwksRepository,
  createMockLogger,
  createMockStoreService,
} from "@/lib/test/mock";
import { InstallAppUseCase } from "./install-app-use-case";

const INPUT = {
  saleorDomain: "test.saleor.cloud",
  saleorApiUrl: "https://test.saleor.cloud/graphql/",
  authToken: "test-token",
  allowedDomains: ["*.saleor.cloud"],
};

describe("InstallAppUseCase", () => {
  it("installs app successfully", async () => {
    // given
    const useCase = new InstallAppUseCase(
      createMockAppConfigRepository(),
      createMockStoreService("app-123"),
      createMockJwksRepository(),
      createMockLogger(),
    );

    // when
    const result = await useCase.execute(INPUT);

    // then
    expect(result.isOk()).toBe(true);
  });

  it("saves config with correct data", async () => {
    // given
    const configRepo = createMockAppConfigRepository();
    const useCase = new InstallAppUseCase(
      configRepo,
      createMockStoreService("app-123"),
      createMockJwksRepository(),
      createMockLogger(),
    );

    // when
    await useCase.execute(INPUT);

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
    const useCase = new InstallAppUseCase(
      createMockAppConfigRepository(),
      createMockStoreService("app-123"),
      createMockJwksRepository(),
      createMockLogger(),
    );

    // when
    const result = await useCase.execute({
      ...INPUT,
      saleorDomain: "evil.example.com",
    });

    // then
    const error = result._unsafeUnwrapErr();
    expect(error.code).toBe("INSTALL_APP_DOMAIN_NOT_ALLOWED_ERROR");
    expect(error.cause).toBeUndefined();
  });

  it("returns INSTALL_APP_FETCH_ID_ERROR when store service fails", async () => {
    // given
    const failingService: StoreService = {
      ...createMockStoreService(),
      getAppId: async () => err({ code: "STORE_REQUEST_ERROR", message: "connection refused" }),
    };
    const useCase = new InstallAppUseCase(
      createMockAppConfigRepository(),
      failingService,
      createMockJwksRepository(),
      createMockLogger(),
    );

    // when
    const result = await useCase.execute(INPUT);

    // then
    const error = result._unsafeUnwrapErr();
    expect(error.code).toBe("INSTALL_APP_FETCH_ID_ERROR");
    expect(error.cause).toEqual({
      code: "STORE_REQUEST_ERROR",
      message: "connection refused",
    });
  });

  it("returns INSTALL_APP_SAVE_CONFIG_ERROR when config save fails", async () => {
    // given
    const failingRepo: AppConfigRepository = {
      get: async () => ok(null),
      set: async () => err({ code: "APP_CONFIG_WRITE_ERROR", message: "write failed" }),
      delete: async () => ok(undefined),
    };
    const useCase = new InstallAppUseCase(
      failingRepo,
      createMockStoreService(),
      createMockJwksRepository(),
      createMockLogger(),
    );

    // when
    const result = await useCase.execute(INPUT);

    // then
    const error = result._unsafeUnwrapErr();
    expect(error.code).toBe("INSTALL_APP_SAVE_CONFIG_ERROR");
    expect(error.cause).toEqual({
      code: "APP_CONFIG_WRITE_ERROR",
      message: "write failed",
    });
  });

  it("returns INSTALL_APP_JWKS_PREFETCH_ERROR when jwks prefetch fails", async () => {
    // given
    const failingJwks: JWKSRepository = {
      getKeys: async () => err({ code: "JWKS_FETCH_ERROR", message: "fetch failed" }),
    };
    const useCase = new InstallAppUseCase(
      createMockAppConfigRepository(),
      createMockStoreService(),
      failingJwks,
      createMockLogger(),
    );

    // when
    const result = await useCase.execute(INPUT);

    // then
    const error = result._unsafeUnwrapErr();
    expect(error.code).toBe("INSTALL_APP_JWKS_PREFETCH_ERROR");
    expect(error.cause).toEqual({
      code: "JWKS_FETCH_ERROR",
      message: "fetch failed",
    });
  });
});
