import { test } from "vite-plus/test";

import type { AppConfigRepository } from "@/domain/ports/app-config-repository";
import type { JoseAuthService } from "@/domain/ports/jose-auth-service";
import type { JWKSRepository } from "@/domain/ports/jwks-repository";
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
  joseAuthService: JoseAuthService;
  appConfigRepository: AppConfigRepository;
  buildAppConfigRepository: (initial?: Record<string, SaleorAppConfig>) => AppConfigRepository;
};

export const it = test.extend<Fixtures>({
  logger: async ({}, use) => {
    await use(createMockLogger());
  },
  jwksRepository: async ({}, use) => {
    await use(createMockJwksRepository());
  },
  joseAuthService: async ({}, use) => {
    await use(createMockJoseAuthService());
  },
  appConfigRepository: async ({}, use) => {
    await use(createMockAppConfigRepository());
  },
  buildAppConfigRepository: async ({}, use) => {
    await use((initial) => createMockAppConfigRepository(initial));
  },
});
