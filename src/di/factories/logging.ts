import type { Logger, LoggerOptions } from "@/domain/ports/logger";
import { createPinoLogger } from "@/infrastructure/logging/pino/pino-logger";

export const createLogger = (opts: LoggerOptions): Logger => createPinoLogger(opts);
