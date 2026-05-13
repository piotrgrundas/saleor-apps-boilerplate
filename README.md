# Saleor App Boilerplate

A production-ready Saleor App boilerplate built with **Vite+**, **Hono**, and **React 19**. Features clean architecture, multi-app support, type-safe error handling, and AWS-ready deployment.

## Tech Stack

| Layer          | Technology                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| Toolchain      | [Vite+](https://viteplus.dev) (Vite 8, Rolldown, Oxlint, Oxfmt, Vitest)          |
| HTTP Framework | [Hono](https://hono.dev)                                                         |
| Frontend       | React 19, React Router 7, [@saleor/macaw-ui](https://github.com/saleor/macaw-ui) |
| Validation     | [Zod v4](https://zod.dev)                                                        |
| Error Handling | [neverthrow](https://github.com/supermacro/neverthrow) (Result types)            |
| Auth           | [jose](https://github.com/panva/jose) (JWT/JWK/JWS)                              |
| GraphQL        | [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server), graphql-codegen       |
| DI             | [iti](https://github.com/molszanski/iti)                                         |
| Secrets        | AWS Secrets Manager                                                              |
| Logging        | [consola](https://github.com/unjs/consola), [Sentry](https://sentry.io)          |
| Testing        | [Vitest](https://vitest.dev) (via Vite+)                                         |
| Deployment     | Docker, AWS Lambda                                                               |

## Architecture

```
src/
├── application/
│   ├── domain/            # Saleor-agnostic interfaces, error codes, use-case contract
│   ├── infrastructure/    # Implementations: Saleor client, JWKS/JWT, AWS, logging
│   └── use-cases/         # Business logic (e.g. InstallAppUseCase)
├── apps/
│   ├── handler/           # Main app: Saleor webhooks, GraphQL API, React SPA
│   └── dashboard/         # Configuration UI: REST API, React SPA
├── di/                    # Dependency injection container + factories
├── lib/                   # Generic, Saleor-free utilities
│   ├── client/            # React mounting, Saleor Apps provider
│   ├── config/            # Base config schemas + helpers
│   ├── error/             # HttpError, DomainException, error handler
│   ├── graphql/           # GraphQL fetch client, helpers
│   ├── middleware/         # Hono middleware: logging, health, assets, validation
│   ├── test/              # Test helpers: mock factories, test app/request builders
│   ├── utils/             # Standalone utils: allowlist, money, invariant, type-guards
│   └── zod/               # Zod utilities
├── graphql/               # Generated Saleor schema types
├── types/                 # Global type declarations
└── serve.ts               # Local dev server entry point
```

### Key Principles

- **`lib/` is Saleor-free** — anything Saleor-specific lives in `application/infrastructure/saleor/`
- **Domain layer is framework-agnostic** — no Hono, no Saleor imports, only pure interfaces + `Result` types
- **Multi-app architecture** — each app in `src/apps/*/` has its own `entry-server.ts` and `entry-client.tsx`, auto-discovered at build time
- **DI container** — all dependencies wired in `src/di/container.ts`

## Getting Started

### Prerequisites

- [Vite+](https://viteplus.dev) (manages Node.js and pnpm automatically)
- [Docker](https://www.docker.com/) (for LocalStack / AWS Secrets Manager locally)

### Setup

```bash
# Install dependencies
vp install

# Copy environment config
cp .env.example .env

# Start LocalStack (AWS Secrets Manager)
docker compose up -d localstack

# Initialize secrets in LocalStack
./tooling/localstack/init-aws.sh

# Start the dev server (with hot reload)
pnpm dev
```

The app will be available at `http://localhost:8000`:

- `/` — Handler app (Saleor webhooks, GraphQL, SPA)
- `/configuration` — Dashboard app (configuration UI)
- `/health` — Health check endpoint

### Docker Development

```bash
# Start everything (app + LocalStack)
docker compose up

# The app runs in a container with hot reload via volume mounts
```

## Commands

| Command                  | Description                                 |
| ------------------------ | ------------------------------------------- |
| `pnpm dev`               | Start dev server with hot reload            |
| `pnpm run build`         | Build server + client for production        |
| `pnpm run build:client`  | Build client bundles only                   |
| `pnpm run preview`       | Build and run in production mode            |
| `vp test`                | Run tests                                   |
| `vp test --watch`        | Run tests in watch mode                     |
| `vp check`               | Lint, format, and type-check (Oxlint/Oxfmt) |
| `pnpm run typecheck`     | TypeScript type checking only               |
| `pnpm run codegen`       | Generate GraphQL types                      |
| `pnpm run codegen:watch` | Generate GraphQL types (watch mode)         |

## Build & Deployment

The build system uses Vite (client) and tsdown (server). Each app is self-contained under `dist/{appName}/`:

```
dist/
├── handler/
│   ├── entry-server.js      # Server bundle
│   ├── package.json          # ESM + external dependencies
│   ├── node_modules/         # Installed external deps
│   └── assets/               # Client bundle (JS, CSS, fonts)
├── dashboard/
│   └── ...                   # Same structure
├── package.json              # Root ESM marker
└── logo.png                  # Public assets
```

Build steps (`pnpm run build`):

1. **Server** — each `src/apps/*/entry-server.ts` → `dist/{appName}/entry-server.js` (via tsdown)
2. **Client** — each `src/apps/*/entry-client.tsx` → `dist/{appName}/assets/` (via Vite)
3. **External deps** — packages that can't be bundled are installed into `dist/{appName}/node_modules/`
4. **Public** — `public/` is copied to `dist/`

### Server Build Externals

Some packages are excluded from the server bundle because they use native bindings, dynamic `require()`, or are already provided by the runtime. These are defined in `tooling/build/build-utils.ts` as `SERVER_EXTERNALS`:

| Package                           | Reason                         | Action                                             |
| --------------------------------- | ------------------------------ | -------------------------------------------------- |
| `@aws-sdk/client-secrets-manager` | Provided by AWS Lambda runtime | Not bundled, not installed                         |
| `@sentry/aws-serverless`          | Native bindings                | Auto-installed into `dist/{appName}/node_modules/` |
| `@cacheable/node-cache`           | Bundling issues                | Auto-installed into `dist/{appName}/node_modules/` |

To add a new external, add an entry to `SERVER_EXTERNALS` with `reason: "lambda-provided"` or `reason: "install"`. The build reads versions from the root `package.json`.

### Docker Production Build

The `Dockerfile` uses a multi-stage build:

```bash
docker build -t saleor-app .
docker run -p 3000:3000 saleor-app
```

### AWS Lambda

The handler app wraps Hono with a Lambda-compatible handler, so it can be deployed as a serverless function with no changes.

## Environment Variables

| Variable                | Description                              | Default              |
| ----------------------- | ---------------------------------------- | -------------------- |
| `PORT`                  | Server port                              | `3000`               |
| `SALEOR_URL`            | Saleor instance URL                      | —                    |
| `LOG_LEVEL`             | Logging level (debug, info, warn, error) | `debug`              |
| `AWS_ACCESS_KEY_ID`     | AWS access key                           | —                    |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key                           | —                    |
| `AWS_REGION`            | AWS region                               | `us-east-1`          |
| `APP_CONFIG_STORE_PATH` | Parameter Store root path                | `/saleor/app-config` |
| `APP_CONFIG_KMS_KEY_ID` | Optional KMS key for SecureString        | AWS-managed          |
| `AWS_ENDPOINT_URL`      | Custom AWS endpoint (LocalStack)         | —                    |
| `SALEOR_UI_APP_TOKEN`   | Dashboard token for standalone dev       | —                    |
| `BASE_PATH`             | URL prefix for the app                   | —                    |

## CI/CD

GitHub Actions workflows run on every PR:

- **test.yml** — Installs dependencies and runs the test suite
- **code_quality.yml** — Runs linting, type checking, and tests

## awslocal commands

List secretmanager secrets

```
awslocal secretsmanager list-secrets --no-cli-pager \
  --endpoint-url=http://localhost:4566 \
  --region ap-southeast-1
```

Read secret value

```
awslocal secretsmanager get-secret-value --no-cli-pager \
  --region ap-southeast-1 \
  --secret-id "saleor-app-config" \
  --query 'SecretString' \
  --output text | jq .
```

List parameter store paths

```
awslocal ssm describe-parameters --no-cli-pager \
  --endpoint-url=http://localhost:4566 \
  --region ap-southeast-1
```

Read parameter path value

```
awslocal ssm get-parameter --no-cli-pager \
  --region ap-southeast-1 \
  --name "/saleor-app-config/projectluna-dev.eu.saleor.cloud" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text | jq .
```
