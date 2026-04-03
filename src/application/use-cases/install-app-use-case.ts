import { err, ok } from "neverthrow";

import type { InstallAppErrorCode } from "@/application/domain/objects/error";
import type { AsyncDomainResult } from "@/application/domain/objects/result";
import type { AppConfigRepository } from "@/application/domain/repositories/app-config-repository";
import type { JWKSRepository } from "@/application/domain/repositories/jwks-repository";
import type { Logger } from "@/application/domain/services/logger";
import type { StoreService } from "@/application/domain/services/store-service";
import type { UseCase } from "@/application/domain/use-case";
import { isDomainAllowed } from "@/lib/utils/allowlist";

export interface InstallAppInput {
  saleorDomain: string;
  saleorApiUrl: string;
  authToken: string;
  allowedDomains: string[];
}

export class InstallAppUseCase implements UseCase<InstallAppInput, void, InstallAppErrorCode> {
  constructor(
    private __appConfigRepository: AppConfigRepository,
    private __storeService: StoreService,
    private __jwksRepository: JWKSRepository,
    private __logger: Logger,
  ) {}

  async execute(input: InstallAppInput): AsyncDomainResult<void, InstallAppErrorCode> {
    const { saleorDomain, saleorApiUrl, authToken, allowedDomains } = input;

    if (!isDomainAllowed(saleorDomain, allowedDomains)) {
      return err({
        code: "INSTALL_APP_DOMAIN_NOT_ALLOWED_ERROR",
        message: `Domain not allowed: ${saleorDomain}`,
      });
    }

    this.__logger.info(`Installing app for domain: ${saleorDomain}`);

    const appIdResult = await this.__storeService.getAppId(saleorApiUrl, authToken);
    if (appIdResult.isErr()) {
      this.__logger.error("Failed to fetch app ID from Saleor", {
        saleorDomain,
        cause: appIdResult.error,
      });
      return err({
        code: "INSTALL_APP_FETCH_ID_ERROR",
        message: appIdResult.error.message,
        cause: appIdResult.error,
      });
    }

    const appId = appIdResult.value;

    const saveResult = await this.__appConfigRepository.set(saleorDomain, {
      saleorDomain,
      authToken,
      saleorAppId: appId,
      saleorApiUrl,
    });
    if (saveResult.isErr()) {
      this.__logger.error("Failed to save app config", {
        saleorDomain,
        cause: saveResult.error,
      });
      return err({
        code: "INSTALL_APP_SAVE_CONFIG_ERROR",
        message: saveResult.error.message,
        cause: saveResult.error,
      });
    }

    const jwksResult = await this.__jwksRepository.getKeys(saleorDomain, true);
    if (jwksResult.isErr()) {
      this.__logger.error("Failed to prefetch JWKS keys", {
        saleorDomain,
        cause: jwksResult.error,
      });
      return err({
        code: "INSTALL_APP_JWKS_PREFETCH_ERROR",
        message: jwksResult.error.message,
        cause: jwksResult.error,
      });
    }

    this.__logger.info(`App installed successfully for domain: ${saleorDomain}`, { appId });

    return ok(undefined);
  }
}
