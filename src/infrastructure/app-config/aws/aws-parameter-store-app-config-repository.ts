import {
  DeleteParameterCommand,
  GetParameterCommand,
  ParameterNotFound,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { err, ok } from "neverthrow";

import type {
  AppConfigRepository,
  AppConfigRepositoryOptions,
} from "@/domain/ports/app-config-repository";
import {
  saleorAppConfigSchema,
  type SaleorAppConfig,
} from "@/infrastructure/integrations/saleor/app-config/schema";
import { awsConfigSchema } from "@/lib/config/schema";
import { prepareConfig } from "@/lib/config/util";
import { getErrorMessage } from "@/lib/error/helpers";

/**
 * Normalize the configured `configPath` so the resulting parameter name is a
 * valid SSM hierarchical path:
 *   - Always starts with `/`
 *   - No trailing slash before the domain segment
 *
 * SSM requires multi-segment names (anything containing `/`) to begin with `/`.
 */
const normalizeRoot = (value: string): string => {
  const trimmed = value.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const buildParameterName = (configPath: string, saleorDomain: string) =>
  `${normalizeRoot(configPath)}/${saleorDomain}`;

export const createAwsParameterStoreAppConfigRepository = ({
  configPath,
  kmsKeyId,
}: AppConfigRepositoryOptions): AppConfigRepository => {
  // Validate required AWS env vars at construction time so misconfiguration
  // fails fast at boot rather than on first request. Region + credentials
  // are resolved internally by `SSMClient`.
  prepareConfig({
    name: "AwsParameterStoreAppConfigRepository",
    schema: awsConfigSchema,
  });
  const client = new SSMClient();

  return {
    async get(saleorDomain, ctx) {
      const name = buildParameterName(configPath, saleorDomain);
      try {
        const response = await client.send(
          new GetParameterCommand({ Name: name, WithDecryption: true }),
        );

        const value = response.Parameter?.Value;
        if (!value) return ok(null);

        const parsed = saleorAppConfigSchema.safeParse(JSON.parse(value));
        return ok(parsed.success ? parsed.data : null);
      } catch (error) {
        if (error instanceof ParameterNotFound) {
          return ok(null);
        }
        ctx.logger.error("Failed to read app config from AWS Parameter Store", {
          name,
          cause: error,
        });
        return err([
          {
            code: "APP_CONFIG_READ_ERROR",
            message: `Failed to read config - ${name} - from AWS Parameter Store: ${getErrorMessage(error)}`,
            details: { cause: error },
          },
        ]);
      }
    },

    async set({ saleorDomain, config }, ctx) {
      const name = buildParameterName(configPath, saleorDomain);
      try {
        await client.send(
          new PutParameterCommand({
            Name: name,
            Value: JSON.stringify(config),
            Type: "SecureString",
            Overwrite: true,
            ...(kmsKeyId ? { KeyId: kmsKeyId } : {}),
          }),
        );
        return ok(undefined);
      } catch (error) {
        ctx.logger.error("Failed to write app config to AWS Parameter Store", {
          name,
          cause: error,
        });
        return err([
          {
            code: "APP_CONFIG_WRITE_ERROR",
            message: `Failed to write config - ${name} - to AWS Parameter Store: ${getErrorMessage(error)}`,
            details: { cause: error },
          },
        ]);
      }
    },

    async delete(saleorDomain, ctx) {
      const name = buildParameterName(configPath, saleorDomain);
      try {
        await client.send(new DeleteParameterCommand({ Name: name }));
        return ok(undefined);
      } catch (error) {
        if (error instanceof ParameterNotFound) {
          return ok(undefined);
        }
        ctx.logger.error("Failed to delete app config from AWS Parameter Store", {
          name,
          cause: error,
        });
        return err([
          {
            code: "APP_CONFIG_DELETE_ERROR",
            message: `Failed to delete config - ${name} - from AWS Parameter Store: ${getErrorMessage(error)}`,
            details: { cause: error },
          },
        ]);
      }
    },
  };
};

export type { SaleorAppConfig };
