import { test } from "vite-plus/test";

import type {
  AppConfigRepository,
  AppConfigRepositoryProvider,
} from "@/domain/ports/app-config-repository";
import type { JoseAuthService, JoseAuthServiceProvider } from "@/domain/ports/jose-auth-service";
import type { JWKSRepository, JWKSRepositoryProvider } from "@/domain/ports/jwks-repository";
import type { Logger } from "@/domain/ports/logger";
import type { SaleorAppConfig } from "@/infrastructure/integrations/saleor/app-config/schema";

import {
  createMockAppConfigRepository,
  createMockJoseAuthService,
  createMockJwksRepository,
  createMockLogger,
} from "./mock";

type Fixtures = {
  logger: Logger;
  jwksRepository: JWKSRepository;
  jwksRepositoryProvider: JWKSRepositoryProvider;
  joseAuthService: JoseAuthService;
  joseAuthServiceProvider: JoseAuthServiceProvider;
  appConfigRepository: AppConfigRepository;
  appConfigRepositoryProvider: AppConfigRepositoryProvider;
  buildAppConfigRepository: (initial?: Record<string, SaleorAppConfig>) => AppConfigRepository;
};

export const it = test.extend<Fixtures>({
  logger: async ({}, use) => {
    await use(createMockLogger());
  },
  jwksRepository: async ({}, use) => {
    await use(createMockJwksRepository());
  },
  jwksRepositoryProvider: async ({ jwksRepository }, use) => {
    await use(() => jwksRepository);
  },
  joseAuthService: async ({}, use) => {
    await use(createMockJoseAuthService());
  },
  joseAuthServiceProvider: async ({ joseAuthService }, use) => {
    await use(() => joseAuthService);
  },
  appConfigRepository: async ({}, use) => {
    await use(createMockAppConfigRepository());
  },
  appConfigRepositoryProvider: async ({ appConfigRepository }, use) => {
    await use(() => appConfigRepository);
  },
  buildAppConfigRepository: async ({}, use) => {
    await use((initial) => createMockAppConfigRepository(initial));
  },
});
