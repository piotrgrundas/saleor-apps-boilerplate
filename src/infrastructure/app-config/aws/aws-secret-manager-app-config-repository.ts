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
import type {
  AppConfigRepositoryOptions,
  AppConfigRepositoryProvider,
} from "@/domain/ports/app-config-repository";
import {
  saleorAppConfigMapSchema,
  type SaleorAppConfig,
} from "@/infrastructure/integrations/saleor/app-config/schema";
import { awsConfigSchema } from "@/lib/config/schema";
import { prepareConfig } from "@/lib/config/util";
import { getErrorMessage } from "@/lib/error/helpers";

export const createAwsSecretManagerAppConfigRepository = ({
  configPath,
}: AppConfigRepositoryOptions): AppConfigRepositoryProvider => {
  prepareConfig({
    name: "AwsSecretManagerAppConfigRepository",
    schema: awsConfigSchema,
  });

  const client = new SecretsManagerClient();

  const getConfigMap = async (
    ctx: Context,
  ): AsyncResult<Record<string, SaleorAppConfig>, AppConfigErrorCode> => {
    try {
      const command = new GetSecretValueCommand({ SecretId: configPath });
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
        configPath,
        cause: error,
      });
      return err([
        {
          code: "APP_CONFIG_READ_ERROR",
          message: `Failed to read config - ${configPath} - from AWS Secrets Manager: ${getErrorMessage(error)}`,
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
        new PutSecretValueCommand({
          SecretId: configPath,
          SecretString: secretString,
        }),
      );

      return ok(undefined);
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        try {
          ctx.logger.info("Secret not found; creating", { configPath });
          await client.send(
            new CreateSecretCommand({
              Name: configPath,
              SecretString: secretString,
            }),
          );

          return ok(undefined);
        } catch (createError) {
          ctx.logger.error("Failed to create app config secret", {
            configPath,
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
        configPath,
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

  return (ctx) => ({
    async get(saleorDomain) {
      const configMapResult = await getConfigMap(ctx);

      if (configMapResult.isErr()) return err(configMapResult.error);

      return ok(configMapResult.value[saleorDomain] ?? null);
    },
    async set({ saleorDomain, config }) {
      const configMapResult = await getConfigMap(ctx);

      if (configMapResult.isErr()) return err(configMapResult.error);

      configMapResult.value[saleorDomain] = config;
      return saveConfigMap(configMapResult.value, ctx);
    },
    async delete(saleorDomain) {
      const configMapResult = await getConfigMap(ctx);

      if (configMapResult.isErr()) return err(configMapResult.error);

      delete configMapResult.value[saleorDomain];

      return saveConfigMap(configMapResult.value, ctx);
    },
  });
};
