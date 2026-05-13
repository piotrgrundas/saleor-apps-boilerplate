import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

import type { Logger } from "@/domain/ports/logger";
import { getElapsedTime } from "@/lib/utils/timing";

const STATIC_PATH_RE =
  /\/(assets|public|static)\/|\.(ico|css|js|map|png|jpe?g|gif|svg|webp|woff2?|ttf)$/i;

const isStaticRequest = (context: Context) => STATIC_PATH_RE.test(context.req.path);

type Options = {
  environment?: string;
  isProduction?: boolean;
  skip?: (context: Context) => boolean;
};

export function createLoggingMiddleware(logger: Logger, options: Options = {}) {
  const { environment, isProduction = false, skip = isStaticRequest } = options;

  return createMiddleware(async (context, next) => {
    const elapsed = getElapsedTime();
    const requestId = context.get("requestId");
    const requestLogger = logger.withContext({
      requestId,
      ...(isProduction && {
        path: context.req.path,
        environment,
        method: context.req.method,
      }),
    });

    context.set("logger", requestLogger);

    if (skip(context)) {
      await next();
      return;
    }

    if (isProduction) {
      requestLogger.info("Incoming request");
    } else {
      requestLogger.info(`${context.req.method} ⇒ ${context.req.path}`);
    }

    await next();

    if (isProduction) {
      requestLogger.info("Outgoing response", {
        requestTime: `${elapsed()}ms`,
        status: context.res.status,
      });
    } else {
      requestLogger.info(
        `${context.req.method} ⇐ ${context.res.status} (${elapsed()}ms) ${context.req.path}`,
      );
    }
  });
}
