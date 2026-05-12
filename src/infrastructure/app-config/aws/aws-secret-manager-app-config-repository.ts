import {
  CreateSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  ResourceNotFoundException,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { err, ok } from "neverthrow";

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

  const getConfigMap = async (): AsyncResult<
    Record<string, SaleorAppConfig>,
    AppConfigErrorCode
  > => {
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
      // Secret doesn't exist yet — treat as empty map.
      if (error instanceof ResourceNotFoundException) {
        return ok({});
      }
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
  ): AsyncResult<void, AppConfigErrorCode> => {
    const secretString = JSON.stringify(configMap);

    try {
      await client.send(
        new PutSecretValueCommand({ SecretId: secretPath, SecretString: secretString }),
      );
      return ok(undefined);
    } catch (error) {
      // Secret doesn't exist yet — create it.
      if (error instanceof ResourceNotFoundException) {
        try {
          await client.send(
            new CreateSecretCommand({ Name: secretPath, SecretString: secretString }),
          );
          return ok(undefined);
        } catch (createError) {
          return err([
            {
              code: "APP_CONFIG_WRITE_ERROR",
              message: `Failed to create config in AWS Secrets Manager: ${getErrorMessage(createError)}`,
              details: { cause: createError },
            },
          ]);
        }
      }
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
    async get(saleorDomain) {
      const configMapResult = await getConfigMap();

      if (configMapResult.isErr()) return err(configMapResult.error);

      return ok(configMapResult.value[saleorDomain] ?? null);
    },
    async set({ saleorDomain, config }) {
      const configMapResult = await getConfigMap();

      if (configMapResult.isErr()) return err(configMapResult.error);

      configMapResult.value[saleorDomain] = config;
      return saveConfigMap(configMapResult.value);
    },
    async delete(saleorDomain) {
      const configMapResult = await getConfigMap();

      if (configMapResult.isErr()) return err(configMapResult.error);

      delete configMapResult.value[saleorDomain];
      return saveConfigMap(configMapResult.value);
    },
  };
};
