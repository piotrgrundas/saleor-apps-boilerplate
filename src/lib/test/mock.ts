import { ok } from "neverthrow";
import { vi } from "vite-plus/test";

import type { AppConfig } from "@/domain/app-config/app-config";
import type { AppConfigRepository } from "@/domain/ports/app-config-repository";
import type { JWKSRepository } from "@/domain/ports/jwks-repository";
import type { JWKSService } from "@/domain/ports/jwks-service";
import type { JWTService } from "@/domain/ports/jwt-service";
import type { Logger } from "@/domain/ports/logger";
import type { StoreService } from "@/domain/ports/store-service";

/**
 * Proxy mock that auto-creates a `vi.fn()` for any accessed property.
 * Use against TS `type`-shaped ports — returns a value typed as the port,
 * so `vi.mocked(mock.method)` works.
 */
export const MagicMock = <T extends object>(): T => {
  const cache = new Map<string | symbol, ReturnType<typeof vi.fn>>();
  return new Proxy({} as T, {
    get(_target, prop) {
      if (!cache.has(prop)) {
        cache.set(prop, vi.fn());
      }
      return cache.get(prop);
    },
  });
};

export function createMockLogger(): Logger {
  return {
    trace: () => {},
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
    async set({ saleorDomain, config }) {
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
