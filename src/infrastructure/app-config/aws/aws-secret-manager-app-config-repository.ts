import {
  GetSecretValueCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { err, ok } from "neverthrow";

import type { AppConfig } from "@/domain/app-config/app-config";
import { appConfigMapSchema } from "@/domain/app-config/app-config";
import type { AsyncResult } from "@/domain/errors/result";
import type { AppConfigErrorCode } from "@/domain/errors/scopes/app-config";
import type { AppConfigRepository } from "@/domain/ports/app-config-repository";
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
    Record<string, AppConfig>,
    AppConfigErrorCode
  > => {
    try {
      const command = new GetSecretValueCommand({ SecretId: secretPath });
      const response = await client.send(command);

      if (!response.SecretString) {
        return ok({});
      }

      const parsed = JSON.parse(response.SecretString);
      const result = appConfigMapSchema.safeParse(parsed);

      return ok(result.success ? result.data : {});
    } catch (error) {
      return err([
        {
          code: "APP_CONFIG_READ_ERROR",
          message: `Failed to read config from AWS Secrets Manager: ${getErrorMessage(error)}`,
          details: { cause: error },
        },
      ]);
    }
  };

  const saveConfigMap = async (
    configMap: Record<string, AppConfig>,
  ): AsyncResult<void, AppConfigErrorCode> => {
    try {
      const command = new PutSecretValueCommand({
        SecretId: secretPath,
        SecretString: JSON.stringify(configMap),
      });

      await client.send(command);
      return ok(undefined);
    } catch (error) {
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
