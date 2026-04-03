import type { Logger } from "@/application/domain/services/logger";
import { TsLogLogger } from "@/application/infrastructure/logging/tslog-logger";
import type { LogLevel } from "@/application/infrastructure/logging/types";

export const createLogger = (): Logger => {
  const logLevel = (process.env.LOG_LEVEL ?? "info") as LogLevel;
  return new TsLogLogger(logLevel);
};
