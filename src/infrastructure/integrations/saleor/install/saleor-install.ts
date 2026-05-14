import { err, ok } from "neverthrow";

import type { Context } from "@/domain/context";
import type { AsyncResult } from "@/domain/errors/result";
import type { SaleorInstallErrorCode } from "@/domain/errors/scopes/saleor-install";
import type { AppConfigRepository } from "@/domain/ports/app-config-repository";
import type { JWKSRepository } from "@/domain/ports/jwks-repository";
import type { FetchSaleorAppId } from "@/infrastructure/integrations/saleor/client/fetch-saleor-app-id";
import { isDomainAllowed } from "@/lib/utils/allowlist";

export type SaleorInstallInput = {
  saleorDomain: string;
  saleorApiUrl: string;
  authToken: string;
  allowedDomains: string[];
};

type Deps = {
  appConfigRepository: AppConfigRepository;
  fetchAppId: FetchSaleorAppId;
  jwksRepository: JWKSRepository;
};

export const createSaleorInstall =
  ({ appConfigRepository, fetchAppId, jwksRepository }: Deps) =>
  async (input: SaleorInstallInput, ctx: Context): AsyncResult<void, SaleorInstallErrorCode> => {
    const { saleorDomain, saleorApiUrl, authToken, allowedDomains } = input;

    if (!isDomainAllowed(saleorDomain, allowedDomains)) {
      return err([
        {
          code: "SALEOR_INSTALL_DOMAIN_NOT_ALLOWED_ERROR",
          message: `Domain not allowed: ${saleorDomain}`,
        },
      ]);
    }

    ctx.logger.info(`Installing app for domain: ${saleorDomain}`);

    const appIdResult = await fetchAppId({ apiUrl: saleorApiUrl, token: authToken }, ctx);
    if (appIdResult.isErr()) {
      ctx.logger.error("Failed to fetch app ID from Saleor", {
        saleorDomain,
        cause: appIdResult.error,
      });
      return err([
        {
          code: "SALEOR_INSTALL_FETCH_ID_ERROR",
          message: appIdResult.error[0]?.message ?? "Failed to fetch app ID",
          details: { cause: appIdResult.error },
        },
      ]);
    }

    const appId = appIdResult.value;

    const saveResult = await appConfigRepository.set(
      {
        saleorDomain,
        config: { saleorDomain, authToken, saleorAppId: appId, saleorApiUrl },
      },
      ctx,
    );
    if (saveResult.isErr()) {
      ctx.logger.error("Failed to save app config", {
        saleorDomain,
        cause: saveResult.error,
      });
      return err([
        {
          code: "SALEOR_INSTALL_SAVE_CONFIG_ERROR",
          message: saveResult.error[0]?.message ?? "Failed to save config",
          details: { cause: saveResult.error },
        },
      ]);
    }

    const jwksResult = await jwksRepository.get({ issuer: saleorApiUrl, forceRefresh: true }, ctx);
    if (jwksResult.isErr()) {
      ctx.logger.error("Failed to prefetch JWKS keys", {
        saleorDomain,
        cause: jwksResult.error,
      });
      return err([
        {
          code: "SALEOR_INSTALL_JWKS_PREFETCH_ERROR",
          message: jwksResult.error[0]?.message ?? "Failed to prefetch JWKS",
          details: { cause: jwksResult.error },
        },
      ]);
    }

    ctx.logger.info(`App installed successfully for domain: ${saleorDomain}`, { appId });

    return ok(undefined);
  };

export type SaleorInstall = ReturnType<typeof createSaleorInstall>;
