import type { Logger, LoggerOptions } from "@/domain/ports/logger";
import { createTsLogLogger } from "@/infrastructure/logging/ts-log/ts-logger";

export const createLogger = (opts: LoggerOptions): Logger => createTsLogLogger(opts);
