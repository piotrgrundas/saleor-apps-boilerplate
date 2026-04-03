import { createMiddleware } from "hono/factory";

import type { Logger } from "@/application/domain/services/logger";
import { getElapsedTime } from "@/lib/utils/timing";

export function createLoggingMiddleware(logger: Logger, meta?: Record<string, unknown>) {
  return createMiddleware(async (c, next) => {
    const elapsed = getElapsedTime();
    const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
    const service = meta?.service as string | undefined;
    const requestLogger = logger.withTag(service ?? "app");

    c.set("logger", requestLogger);

    requestLogger.debug(`${c.req.method} → ${c.req.path}`, {
      requestId,
    });

    await next();

    requestLogger.debug(`${c.req.method} ← ${c.res.status} ${c.req.path}`, {
      requestId,
      duration: `${elapsed()}ms`,
    });
  });
}
