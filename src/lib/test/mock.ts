import { ok } from "neverthrow";

import type { AppConfig } from "@/application/domain/objects/app-config";
import type { AppConfigRepository } from "@/application/domain/repositories/app-config-repository";
import type { JWKSRepository } from "@/application/domain/repositories/jwks-repository";
import type { JWKSService } from "@/application/domain/services/jwks-service";
import type { JWTService } from "@/application/domain/services/jwt-service";
import type { Logger } from "@/application/domain/services/logger";
import type { StoreService } from "@/application/domain/services/store-service";

export function createMockLogger(): Logger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    withTag: () => createMockLogger(),
  };
}

export function createMockAppConfigRepository(
  initialConfigs: Record<string, AppConfig> = {},
): AppConfigRepository {
  const configs = new Map(Object.entries(initialConfigs));

  return {
    async get(saleorDomain) {
      return ok(configs.get(saleorDomain) ?? null);
    },
    async set(saleorDomain, config) {
      configs.set(saleorDomain, config);
      return ok(undefined);
    },
    async delete(saleorDomain) {
      configs.delete(saleorDomain);
      return ok(undefined);
    },
  };
}

export function createMockJwksRepository(): JWKSRepository {
  return {
    async getKeys() {
      return ok([]);
    },
  };
}

export function createMockJwksService(): JWKSService {
  return {
    async verify() {
      return ok("");
    },
  };
}

export function createMockJwtService(): JWTService {
  return {
    async verify() {
      return ok({});
    },
  };
}

export function createMockStoreService(appId = "test-app-id"): StoreService {
  return {
    async getAppId() {
      return ok(appId);
    },
    async verifyWebhook() {
      return ok({
        domain: "test.example.com",
        apiUrl: "https://test.example.com/graphql/",
        event: "TEST_EVENT",
      });
    },
  };
}
