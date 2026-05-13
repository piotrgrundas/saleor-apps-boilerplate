import { captureException, init, setContext, wrapHandler } from "@sentry/aws-serverless";

import type { ErrorReporter } from "@/domain/ports/error-reporter";

/**
 * Sentry SDK is bundled. Auto-instrumentation (OpenTelemetry) is disabled
 * via `defaultIntegrations: false` to keep cold start + memory low. Only
 * error capture stays active.
 */

export type SentryConfig = {
  dsn: string;
  environment?: string;
  release?: string;
};

export const createSentryErrorReporter = (config: SentryConfig): ErrorReporter => {
  init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    defaultIntegrations: false,
    tracesSampleRate: 0,
  });

  return {
    async capture(err, extra) {
      captureException(err, extra ? { extra } : undefined);
    },
    wrap: (handler) => wrapHandler(handler) as typeof handler,
    setContext: (name, context) => setContext(name, context),
  };
};

export const createNoopErrorReporter = (): ErrorReporter => ({
  async capture() {
    // intentional no-op
  },
  wrap: (handler) => handler,
  setContext: () => {
    // intentional no-op
  },
});
