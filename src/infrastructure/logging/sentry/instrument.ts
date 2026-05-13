// Sentry is provided at runtime by the AWS Lambda Layer:
//   arn:aws:lambda:<region>:943013980633:layer:SentryNodeServerlessSDKv10:<version>
// Auto-init happens via NODE_OPTIONS=-r @sentry/aws-serverless/awslambda-auto.
// The import below is lazy so the bundle still loads when the Layer is absent
// (local dev, ad-hoc deploys without Sentry).

type SentryModule = typeof import("@sentry/aws-serverless");

let sentry: SentryModule | null = null;
let attempted = false;

async function load(): Promise<SentryModule | null> {
  if (attempted) return sentry;
  attempted = true;
  try {
    sentry = await import("@sentry/aws-serverless");
  } catch {
    // Layer not attached / package not installed — Sentry stays disabled.
  }
  return sentry;
}

export async function captureException(err: unknown): Promise<void> {
  const s = await load();
  s?.captureException(err);
}
