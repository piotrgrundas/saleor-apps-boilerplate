import { test } from "vite-plus/test";

import type { AppConfig } from "@/domain/app-config/app-config";
import type { AppConfigRepository } from "@/domain/ports/app-config-repository";
import type { JWKSRepository } from "@/domain/ports/jwks-repository";
import type { JWKSService } from "@/domain/ports/jwks-service";
import type { JWTService } from "@/domain/ports/jwt-service";
import type { Logger } from "@/domain/ports/logger";
import type { StoreService } from "@/domain/ports/store-service";
import {
  createMockAppConfigRepository,
  createMockJwksRepository,
  createMockJwksService,
  createMockJwtService,
  createMockLogger,
  createMockStoreService,
} from "./mock";

type Fixtures = {
  logger: Logger;
  jwksRepository: JWKSRepository;
  jwksService: JWKSService;
  jwtService: JWTService;
  storeService: StoreService;
  appConfigRepository: AppConfigRepository;
  buildAppConfigRepository: (initial?: Record<string, AppConfig>) => AppConfigRepository;
  buildStoreService: (appId?: string) => StoreService;
};

export const it = test.extend<Fixtures>({
  logger: async ({}, use) => {
    await use(createMockLogger());
  },
  jwksRepository: async ({}, use) => {
    await use(createMockJwksRepository());
  },
  jwksService: async ({}, use) => {
    await use(createMockJwksService());
  },
  jwtService: async ({}, use) => {
    await use(createMockJwtService());
  },
  storeService: async ({}, use) => {
    await use(createMockStoreService());
  },
  appConfigRepository: async ({}, use) => {
    await use(createMockAppConfigRepository());
  },
  buildAppConfigRepository: async ({}, use) => {
    await use((initial) => createMockAppConfigRepository(initial));
  },
  buildStoreService: async ({}, use) => {
    await use((appId) => createMockStoreService(appId));
  },
});
