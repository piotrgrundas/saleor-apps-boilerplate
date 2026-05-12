import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

import type { Logger } from "@/domain/ports/logger";
import { getElapsedTime } from "@/lib/utils/timing";

const STATIC_PATH_RE =
  /\/(assets|public|static)\/|\.(ico|css|js|map|png|jpe?g|gif|svg|webp|woff2?|ttf)$/i;

const isStaticRequest = (context: Context) =>
  STATIC_PATH_RE.test(context.req.path);

type Options = {
  service?: string;
  skip?: (context: Context) => boolean;
};

export function createLoggingMiddleware(logger: Logger, options: Options = {}) {
  const { service, skip = isStaticRequest } = options;

  return createMiddleware(async (context, next) => {
    const elapsed = getElapsedTime();
    const requestId = context.req.header("x-request-id") ?? crypto.randomUUID();
    const requestLogger = logger.withTag(service ?? "app");

    context.set("logger", requestLogger);

    if (skip(context)) {
      await next();
      return;
    }

    requestLogger.debug(`${context.req.method} ⇒ ${context.req.path}`, {
      requestId,
    });

    await next();

    requestLogger.debug(
      `${context.req.method} ⇐ ${context.res.status} ${context.req.path} (${elapsed()}ms)`,
      { requestId },
    );
  });
}
