import { ok } from "neverthrow";
import { vi } from "vite-plus/test";

import type { Context } from "@/domain/context";
import type { AppConfigRepository } from "@/domain/ports/app-config-repository";
import type { JoseAuthService } from "@/domain/ports/jose-auth-service";
import type { JWKSRepository } from "@/domain/ports/jwks-repository";
import type { Logger } from "@/domain/ports/logger";
import type { SaleorAppConfig } from "@/infrastructure/integrations/saleor/app-config/schema";

export const createTestContext = (): Context => ({
  logger: createMockLogger(),
});

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
    withContext: () => createMockLogger(),
  };
}

export function createMockAppConfigRepository(
  initialConfigs: Record<string, SaleorAppConfig> = {},
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
    async get() {
      return ok({ keys: [] });
    },
    async set() {
      return ok(undefined);
    },
  };
}

export function createMockJoseAuthService(): JoseAuthService {
  return {
    async verifyJWT() {
      return ok({});
    },
    async verifyJWS() {
      return ok("");
    },
    async verifyJWSDetached() {
      return ok(undefined);
    },
  };
}
