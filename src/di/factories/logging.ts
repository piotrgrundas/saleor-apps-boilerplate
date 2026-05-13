import type { Logger, LogLevel } from "@/domain/ports/logger";
import { createTsLogLogger } from "@/infrastructure/logging/ts-log/ts-logger";

export const createLogger = ({ level }: { level: LogLevel }): Logger =>
  createTsLogLogger({ level });
