import type { Logger } from "@/domain/ports/logger";
import { createTsLogLogger } from "@/infrastructure/logging/ts-log/ts-logger";
import type { LogLevel } from "@/infrastructure/logging/types";

export const createLogger = ({ level }: { level: LogLevel }): Logger =>
  createTsLogLogger({ level });
