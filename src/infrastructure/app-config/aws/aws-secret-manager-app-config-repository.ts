import {
  CreateSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  ResourceNotFoundException,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { err, ok } from "neverthrow";

import type { Context } from "@/domain/context";
import type { AsyncResult } from "@/domain/errors/result";
import type { AppConfigErrorCode } from "@/domain/errors/scopes/app-config";
import type { AppConfigRepository } from "@/domain/ports/app-config-repository";
import {
  saleorAppConfigMapSchema,
  type SaleorAppConfig,
} from "@/infrastructure/integrations/saleor/app-config/schema";
import { getErrorMessage } from "@/lib/error/helpers";

type AwsSecretManagerOptions = {
  region: string;
  secretPath: string;
  endpoint?: string;
};

export const createAwsSecretManagerAppConfigRepository = (
  options: AwsSecretManagerOptions,
): AppConfigRepository => {
  const client = new SecretsManagerClient({
    region: options.region,
    ...(options.endpoint ? { endpoint: options.endpoint } : {}),
  });
  const secretPath = options.secretPath;

  const getConfigMap = async (
    ctx: Context,
  ): AsyncResult<Record<string, SaleorAppConfig>, AppConfigErrorCode> => {
    try {
      const command = new GetSecretValueCommand({ SecretId: secretPath });
      const response = await client.send(command);

      if (!response.SecretString) {
        return ok({});
      }

      const parsed = JSON.parse(response.SecretString);
      const result = saleorAppConfigMapSchema.safeParse(parsed);

      return ok(result.success ? result.data : {});
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        return ok({});
      }
      ctx.logger.error("Failed to read app config from AWS Secrets Manager", {
        secretPath,
        cause: error,
      });
      return err([
        {
          code: "APP_CONFIG_READ_ERROR",
          message: `Failed to read config - ${secretPath} - from AWS Secrets Manager: ${getErrorMessage(error)}`,
          details: { cause: error },
        },
      ]);
    }
  };

  const saveConfigMap = async (
    configMap: Record<string, SaleorAppConfig>,
    ctx: Context,
  ): AsyncResult<void, AppConfigErrorCode> => {
    const secretString = JSON.stringify(configMap);

    try {
      await client.send(
        new PutSecretValueCommand({ SecretId: secretPath, SecretString: secretString }),
      );
      return ok(undefined);
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        try {
          ctx.logger.info("Secret not found; creating", { secretPath });
          await client.send(
            new CreateSecretCommand({ Name: secretPath, SecretString: secretString }),
          );
          return ok(undefined);
        } catch (createError) {
          ctx.logger.error("Failed to create app config secret", {
            secretPath,
            cause: createError,
          });
          return err([
            {
              code: "APP_CONFIG_WRITE_ERROR",
              message: `Failed to create config in AWS Secrets Manager: ${getErrorMessage(createError)}`,
              details: { cause: createError },
            },
          ]);
        }
      }
      ctx.logger.error("Failed to write app config to AWS Secrets Manager", {
        secretPath,
        cause: error,
      });
      return err([
        {
          code: "APP_CONFIG_WRITE_ERROR",
          message: `Failed to write config to AWS Secrets Manager: ${getErrorMessage(error)}`,
          details: { cause: error },
        },
      ]);
    }
  };

  return {
    async get(saleorDomain, ctx) {
      const configMapResult = await getConfigMap(ctx);

      if (configMapResult.isErr()) return err(configMapResult.error);

      return ok(configMapResult.value[saleorDomain] ?? null);
    },
    async set({ saleorDomain, config }, ctx) {
      const configMapResult = await getConfigMap(ctx);

      if (configMapResult.isErr()) return err(configMapResult.error);

      configMapResult.value[saleorDomain] = config;
      return saveConfigMap(configMapResult.value, ctx);
    },
    async delete(saleorDomain, ctx) {
      const configMapResult = await getConfigMap(ctx);

      if (configMapResult.isErr()) return err(configMapResult.error);

      delete configMapResult.value[saleorDomain];
      return saveConfigMap(configMapResult.value, ctx);
    },
  };
};
