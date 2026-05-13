<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/saleor-light.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/saleor-dark.png">
    <img height="50" alt="Saleor" src="docs/saleor-dark.png">
  </picture>
  &nbsp;&nbsp;
  <img height="50" alt="Vite+" src="docs/vite-plus.png">
</div>

# Saleor App Boilerplate

Serverless [Saleor](https://saleor.io) app boilerplate built with [Vite+](https://viteplus.dev). Hono on the server, React 19 on the client, hexagonal layout, AWS Lambda ready.

## Stack

[Vite+](https://viteplus.dev) (Vite 8, Rolldown, Oxlint, Oxfmt, Vitest) · [Hono](https://hono.dev) · React 19 + [@saleor/macaw-ui](https://github.com/saleor/macaw-ui) · [Zod v4](https://zod.dev) · [neverthrow](https://github.com/supermacro/neverthrow) · [jose](https://github.com/panva/jose) · [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) · [iti](https://github.com/molszanski/iti) DI · AWS SSM Parameter Store / Secrets Manager · [Sentry](https://sentry.io) · AWS Lambda

## Layout

```
src/
├── domain/           # Pure types, ports, error codes
├── application/      # Use-cases (factory functions)
├── infrastructure/   # Adapters: AWS, JOSE, Saleor integration
├── di/               # Global container + factories
├── apps/             # Auto-discovered apps (handler, dashboard)
└── lib/              # Generic, Saleor-free utilities
```

Architecture docs: see `.agents/skills/ddd/`.

## Setup

```bash
vp upgrade           # keep global vp in sync with project version (fixes cache db mismatch)
vp install
cp .env.example .env

docker compose up -d localstack

vp run dev
```

Locally, apps are auto-discovered. BASE_PATH is applied as app-name dir (src/apps/\*) and app is available under:

- http://localhost:8000/handler/(\*<APP_ROUTES>)
- http://localhost:8000/dashboard/(\*<APP_ROUTES>)

## Commands

| Command          | Description                   |
| ---------------- | ----------------------------- |
| `vp run dev`     | Dev server, hot reload        |
| `vp run build`   | Build server + client         |
| `vp test`        | Run tests                     |
| `vp check`       | Lint + format + type-check    |
| `vp run codegen` | Generate Saleor GraphQL types |

## Environment

| Variable                | Description                                   | Default              |
| ----------------------- | --------------------------------------------- | -------------------- |
| `LOG_LEVEL`             | `trace` / `debug` / `info` / `warn` / `error` | `info`               |
| `AWS_REGION`            | AWS region                                    | —                    |
| `AWS_ACCESS_KEY_ID`     | AWS access key                                | —                    |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key                                | —                    |
| `AWS_ENDPOINT_URL`      | Custom AWS endpoint (LocalStack)              | —                    |
| `APP_CONFIG_STORE_PATH` | Parameter Store root / secret name            | `/saleor/app-config` |
| `APP_CONFIG_KMS_KEY_ID` | KMS key for SecureString                      | AWS-managed          |
| `BASE_PATH`             | URL prefix for the app                        | —                    |

## Deployment

Handler wraps Hono with a Lambda adapter — drop-in serverless. `tooling/lambda/package.sh` builds `artifact.zip`.

Server bundle externals (`tooling/build/build-utils.ts`) — kept external because the runtime provides them:

- `@aws-sdk/*` — AWS Lambda Node 24 runtime
- `@sentry/*`, `@opentelemetry/*` — Sentry Lambda Layer (see below)

Everything else gets bundled. No per-app `pnpm install` step.

### Sentry Lambda Layer (required for error reporting)

Sentry SDK is **not bundled** — it's provided at runtime by the AWS Lambda Layer. Auto-instrumentation kicks in via `NODE_OPTIONS` preload; the app code only calls `Sentry.captureException` in the error handler.

Wire this up in Terraform (or your IaC):

```hcl
resource "aws_lambda_function" "handler" {
  # ...
  runtime       = "nodejs24.x"
  architectures = ["arm64"]

  layers = [
    # Lookup the latest ARN for your region + architecture:
    # https://docs.sentry.io/platforms/javascript/guides/aws-lambda/install/layer/
    "arn:aws:lambda:eu-central-1:943013980633:layer:SentryNodeServerlessSDKv10:<VERSION>"
  ]

  environment {
    variables = {
      NODE_OPTIONS              = "-r @sentry/aws-serverless/awslambda-auto"
      SENTRY_DSN                = var.sentry_dsn
      SENTRY_TRACES_SAMPLE_RATE = "0.1"
      SENTRY_ENVIRONMENT        = var.environment
      # Optional: SENTRY_RELEASE, SENTRY_PROFILES_SAMPLE_RATE
    }
  }
}
```

The Sentry SDK is imported **lazily** in `src/infrastructure/logging/sentry/instrument.ts` (dynamic `import()` wrapped in try/catch). So:

- **With Layer attached + `SENTRY_DSN`**: errors flow to Sentry. Auto-init via `NODE_OPTIONS=-r @sentry/aws-serverless/awslambda-auto`.
- **Without Layer**: dynamic import fails, capture is a silent no-op. Lambda still loads and serves traffic; you lose only error reporting.
- **Local dev**: `@sentry/aws-serverless` is in `dependencies` (installed locally), so the import succeeds but Sentry stays uninitialized without `SENTRY_DSN`. Capture is a no-op. Call `Sentry.init({ dsn: ... })` from a dev entry if you want local reporting.

## awslocal commands

List Secrets Manager secrets:

```bash
awslocal secretsmanager list-secrets --no-cli-pager \
  --endpoint-url=http://localhost:4566 \
  --region ap-southeast-1
```

Read secret value:

```bash
awslocal secretsmanager get-secret-value --no-cli-pager \
  --region ap-southeast-1 \
  --secret-id "saleor-app-config" \
  --query 'SecretString' \
  --output text | jq .
```

List Parameter Store paths:

```bash
awslocal ssm describe-parameters --no-cli-pager \
  --endpoint-url=http://localhost:4566 \
  --region ap-southeast-1
```

Read parameter value:

```bash
awslocal ssm get-parameter --no-cli-pager \
  --region ap-southeast-1 \
  --name "/saleor-app-config/<saleor-domain>" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text | jq .
```
