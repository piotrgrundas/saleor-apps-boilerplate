import type { Context } from "hono";

import type { Logger } from "@/domain/ports/logger";
import { captureException } from "@/infrastructure/logging/sentry/instrument";

import { DomainException, HttpError, InternalServerError } from "./base";
import { getErrorMessage } from "./helpers";

export function createErrorHandler(fallbackLogger: Logger) {
  return async (err: Error, context: Context) => {
    const logger = (context.get("logger") as Logger | undefined) ?? fallbackLogger;

    if (err instanceof DomainException) {
      logger.warn(`HTTP ${err.status}: ${err.message}`, {
        code: err.errors[0]?.code,
        statusCode: err.status,
      });

      return context.json(err.serialize(), { status: err.status });
    }

    if (err instanceof HttpError) {
      logger.warn(`HTTP ${err.status}: ${err.message}`, {
        error: err.error,
        statusCode: err.status,
      });

      return context.json(err.serialize(), { status: err.status });
    }

    logger.error("Unhandled error", {
      error: getErrorMessage(err),
      stack: err.stack,
    });
    await captureException(err);

    return context.json(new InternalServerError().serialize(), { status: 500 });
  };
}
