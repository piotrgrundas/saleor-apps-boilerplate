# Best Practices

Guidelines for developers and AI assistants working with this codebase.

## Architecture Rules

### Layer Boundaries

- **`lib/` is Saleor-free.** Never import from `@/application/` or Saleor SDKs in `lib/`. If it talks to Saleor, it belongs in `application/infrastructure/saleor/`.
- **Domain layer is framework-agnostic.** `application/domain/` must not import Hono, Saleor, AWS, or any framework. Only pure TypeScript interfaces, `neverthrow` Result types, and Zod schemas.
- **Infrastructure implements domain interfaces.** Create the interface in `domain/services/` or `domain/repositories/`, then implement it in `infrastructure/`.
- **App-specific code stays in `apps/*/`.** Config schemas, React providers, route definitions, and HTML mount logic live in the app, not in `lib/` or `application/`.

### Dependency Injection

- All dependencies are wired in `src/di/container.ts` using `iti`.
- Each dependency has a factory in `src/di/factories/`.
- Never instantiate infrastructure classes directly in route handlers — always pull from the container.
- For tests, use the mock factories in `src/lib/test/mock.ts` instead of the real container.

### Error Handling

- **Domain errors** use `neverthrow` `Result<T, DomainError>`. Define error codes in `application/domain/objects/error.ts` using the `*_ERROR` suffix convention.
- **HTTP errors** use the classes in `lib/error/base.ts` (`BadRequestError`, `NotFoundError`, etc.).
- **Bridge domain to HTTP** with `DomainException` and its subclasses (`ForbiddenException`, `BadGatewayException`, etc.) — they wrap a `DomainError` with an HTTP status.
- Use cases must return `Result`, never throw. Let the route handler decide how to map domain errors to HTTP responses.

### Use Case Pattern

```typescript
// Domain contract
interface UseCase<TInput, TOutput, TErrorCode extends ErrorCode> {
  execute(input: TInput): Promise<Result<TOutput, DomainError<TErrorCode>>>;
}
```

- One use case class per business operation.
- Inject dependencies via constructor.
- Return `Result` — never throw exceptions.
- Keep the use case Saleor-agnostic when possible; pass in data, not Saleor-specific types.

## Adding New Features

### New App

1. Create `src/apps/{name}/entry-server.ts` (Hono app) and `src/apps/{name}/entry-client.tsx` (React SPA).
2. Add a config schema in `src/apps/{name}/config/schema.ts` and export `APP_CONFIG` from `config/index.ts`.
3. Register the app route in `src/serve.ts`.
4. The build system auto-discovers entry points — no config changes needed.

### New Saleor Webhook

1. Add the subscription `.graphql` file in your app's `graphql/saleor/subscriptions/` directory.
2. Run `pnpm run codegen` to generate typed document nodes.
3. Create the webhook handler in `apps/{name}/api/rest/saleor/webhooks.ts`.
4. Register the webhook in the app's Saleor manifest.

### New Domain Error Code

1. Add the error code to the appropriate `*_ERROR_CODES` array in `application/domain/objects/error.ts`.
2. Add the corresponding type alias.
3. Include it in the `ErrorCodes` union.

### New Infrastructure Service

1. Define the interface in `application/domain/services/`.
2. Implement it in `application/infrastructure/`.
3. Create a factory in `src/di/factories/`.
4. Register it in `src/di/container.ts`.
5. Write tests alongside the implementation.

## Code Style

### General

- **Vite+** handles formatting and linting via Oxfmt/Oxlint. Run `vp check --fix` before committing. Don't fight auto-formatting.
- 2-space indentation, double quotes, semicolons, 100-char line width.
- Use the `@/` path alias for all imports from `src/`. Never use deep relative paths like `../../../lib/`.

### TypeScript

- Strict mode is enabled. Don't use `any` — use `unknown` and narrow.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- Use `as const satisfies` for typed constant arrays (see error codes pattern).
- Hono `HTTPException` requires `ContentfulStatusCode`, not `number` — use the error classes in `lib/error/base.ts`.

### Zod

- Use Zod v4 API. Validation schemas go next to the code that uses them.
- For request validation, use the `zodValidatorMiddleware` from `lib/middleware/`.
- Config schemas live in each app's `config/schema.ts`.

## Testing

### Conventions

- Import `{ describe, expect, it, vi }` from **`vite-plus/test`**.
- Structure test bodies with `// given`, `// when`, `// then` comments.
- All `expect()` calls belong in `// then` (or `// when & then` for one-liners).
- Use `it.each` with `$desc` template literals for parameterized tests.
- Mock external dependencies via `vi.mock()` at the top of the file.

### Test Helpers

- `createTestApp(routes)` — creates a minimal Hono app for testing middleware/routes.
- `createTestRequest(method, path, options)` — builds a `Request` object for handler tests.
- `createMockLogger()` — returns a mock logger that satisfies the `Logger` interface.
- All helpers live in `src/lib/test/`.

### What to Test

- **Use cases**: test the `execute()` method, mock all infrastructure dependencies.
- **Middleware**: test with `createTestApp()`, verify headers/status/body.
- **Infrastructure**: test implementations against mocks or LocalStack.
- **Utils**: unit test pure functions directly.
- Don't test Hono routing wiring or React component rendering unless there's meaningful logic.

## Common Patterns

### GraphQL Codegen

- Remote Saleor schema types are generated to `src/graphql/saleor/schema.ts`.
- Operation types are generated next to their `.graphql` files with `.generated.ts` extension.
- The handler app's custom GraphQL API types are generated from `schema.graphql`.
- Always run `pnpm run codegen` after changing `.graphql` files.
- Generated files (`*.generated.*`, `schema.ts` in `graphql/`) are excluded from linting.

### Saleor Webhook Validation

The `saleorWebhookValidationMiddleware` validates incoming webhook requests:

1. Parses required Saleor headers (`saleor-domain`, `saleor-api-url`, `saleor-event`, `saleor-signature`).
2. Verifies the JWS signature against Saleor's JWKS endpoint.
3. Sets `saleorDomain`, `saleorApiUrl`, and `saleorEvent` on the Hono context.

### Config Validation

Each app validates its environment at startup using Zod:

```typescript
// apps/{name}/config/schema.ts
export const appConfigSchema = baseConfigSchema.extend({ ... });

// apps/{name}/config/index.ts
export const APP_CONFIG = prepareConfig(appConfigSchema);
```

### Logging

- Use the `Logger` interface from `application/domain/services/logger.ts`.
- The `ConsolaLogger` implementation auto-redacts sensitive keys (token, secret, password, etc.).
- Middleware adds request-scoped tags (request ID, method, path).

### Server Build Externals

Some packages can't be bundled by the server bundler (tsdown) and are kept as bare imports via the `SERVER_EXTERNALS` array in `scripts/build-utils.ts`. Each external has a `reason`:

- **`lambda-provided`** — the package is available in the AWS Lambda runtime (e.g., `@aws-sdk/*`). Not bundled, not installed into the build output.
- **`install`** — the package fails to bundle (native bindings, dynamic `require()`, etc.). The build script auto-installs it into `dist/{appName}/node_modules/`.

To add a new external:

1. Add an entry to `SERVER_EXTERNALS` in `scripts/build-utils.ts` with the appropriate `reason`.
2. Ensure the package is in the root `package.json` `dependencies` (the build reads versions from there).
3. Run `pnpm run build` — the package will be excluded from the bundle and installed automatically if `reason` is `"install"`.

## Gotchas

- `@saleor/macaw-ui` `Text` component: no `variant` prop — use `as` + `size` (number).
- `@cacheable/node-cache` `.get()` doesn't accept a generic — cast the result.
- Vite outputs CSS as a separate file — make sure the HTML template links it.
- `scripts/` directory uses top-level await — it's excluded from `tsc`.
- The dev server defaults to port 8000, but Docker/production uses port 3000 via `PORT` env var.
- **Server build externals** — see the `SERVER_EXTERNALS` array in `scripts/build-utils.ts`.
