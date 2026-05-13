import type {
  AppConfigRepository,
  AppConfigRepositoryOptions,
} from "@/domain/ports/app-config-repository";
import { createAwsParameterStoreAppConfigRepository } from "@/infrastructure/app-config/aws/aws-parameter-store-app-config-repository";

export const createAppConfig = (opts: AppConfigRepositoryOptions): AppConfigRepository =>
  createAwsParameterStoreAppConfigRepository(opts);
