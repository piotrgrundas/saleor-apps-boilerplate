import type {
  AppConfigRepositoryOptions,
  AppConfigRepositoryProvider,
} from "@/domain/ports/app-config-repository";
import { createAwsParameterStoreAppConfigRepository } from "@/infrastructure/app-config/aws/aws-parameter-store-app-config-repository";

export const createAppConfig = (opts: AppConfigRepositoryOptions): AppConfigRepositoryProvider =>
  createAwsParameterStoreAppConfigRepository(opts);
