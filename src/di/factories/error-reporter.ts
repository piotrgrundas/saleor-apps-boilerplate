import type { ErrorReporter } from "@/domain/ports/error-reporter";
import {
  createNoopErrorReporter,
  createSentryErrorReporter,
} from "@/infrastructure/integrations/sentry/sentry-error-reporter";

export type ErrorReporterConfig = {
  sentryDsn?: string;
  environment?: string;
  release?: string;
};

export const createErrorReporter = (config: ErrorReporterConfig): ErrorReporter =>
  config.sentryDsn
    ? createSentryErrorReporter({
        dsn: config.sentryDsn,
        environment: config.environment,
        release: config.release,
      })
    : createNoopErrorReporter();
