import * as Sentry from "@sentry/aws-serverless";

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
      environment: process.env.NODE_ENV ?? "production",
    });
  }
}

export { Sentry };
