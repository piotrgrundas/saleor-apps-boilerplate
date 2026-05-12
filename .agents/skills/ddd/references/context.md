# Context — request-scoped data

`src/domain/context.ts`:

```typescript
import type { Logger } from "./ports/logger";

export type Context = {
  logger: Logger;
  // future: signal?, deadline?, tenantId?, traceparent?
};
```

Single mechanism for cross-cutting request-scoped data. Threaded as the last argument through every fallible operation.

## What goes in Context vs Deps

| Category | Goes in | Reason |
|---|---|---|
| Other ports/adapters (storage, queue, repository) | `Deps` | Bound at construction; never varies per call |
| Static config (region, bucket, timeout defaults) | `Deps` | Same lifetime as the consumer |
| `logger` | `Context` | Per-request enrichment (`withContext({ requestId, path })`) |
| `signal: AbortSignal` (future) | `Context` | Caller-initiated cancellation |
| `deadline: Date` (future) | `Context` | Timeout cascade |
| `tenantId` (future) | `Context` | Multi-tenant scoping per call |
| `traceparent` (future) | `Context` | W3C trace context propagation |

Rule: if it varies per call → `Context`. If it's bound once for the consumer's lifetime → `Deps`.

## Port shape

Every fallible method takes `(input, ctx: Context)`:

```typescript
// src/domain/ports/app-config-repository.ts
export type AppConfigRepository = {
  get(saleorDomain: string, ctx: Context): AsyncResult<SaleorAppConfig | null, AppConfigErrorCode>;
  set(input: { saleorDomain: string; config: SaleorAppConfig }, ctx: Context): AsyncResult<void, AppConfigErrorCode>;
  delete(saleorDomain: string, ctx: Context): AsyncResult<void, AppConfigErrorCode>;
};
```

Reserve the slot now, even if a method doesn't use `ctx` today. Avoids signature retrofit later.

## Adapter shape

Adapter uses `ctx.logger` directly. No logger in factory opts:

```typescript
export const createAwsSecretManagerAppConfigRepository = (
  options: AwsSecretManagerOptions,
): AppConfigRepository => ({
  async get(saleorDomain, ctx) {
    ctx.logger.debug("reading app config", { saleorDomain });
    // ...
    if (failure) {
      ctx.logger.error("failed to read", { cause });
      return err([{ code: "APP_CONFIG_READ_ERROR", ... }]);
    }
    return ok(value);
  },
  // ...
});
```

Adapter logs carry request context because `ctx.logger` is the request-scoped logger constructed at the boundary.

## Use-case / procedure shape

`Deps` drops `logger`. Use-case factory's returned function takes `(input, ctx)`:

```typescript
type Deps = {
  appConfigRepository: AppConfigRepository;
  fetchAppId: FetchSaleorAppId;
  jwksRepository: JWKSRepository;
};

export const createSaleorInstall =
  ({ appConfigRepository, fetchAppId, jwksRepository }: Deps) =>
  async (input: SaleorInstallInput, ctx: Context): AsyncResult<void, SaleorInstallErrorCode> => {
    ctx.logger.info("installing...");
    const appIdResult = await fetchAppId(input, ctx);
    // ...
  };
```

## Plain function shape

Even standalone fns take ctx if they may log/fail:

```typescript
export type FetchSaleorAppId = (
  input: { apiUrl: string; token: string },
  ctx: Context,
) => AsyncResult<string, SaleorErrorCode>;
```

## Boundary — constructing ctx

Route handler / lambda entry reads request-scoped data (typically the logger that middleware attached to Hono context) and builds ctx:

```typescript
// route handler
async (context) => {
  const ctx = { logger: context.get("logger") };
  const result = await saleorInstall(input, ctx);
  // ...
}
```

Mw populates `context.get("logger")` with `baseLogger.withTag(service).withContext({ requestId, path })` — that's the per-request enriched logger.

## Tests

`createTestContext()` helper in `src/lib/test/mock.ts`:

```typescript
export const createTestContext = (): Context => ({
  logger: createMockLogger(),
});

// in tests
await repo.get("domain", createTestContext());
await install(INPUT, createTestContext());
```

Pass any custom logger by inlining `{ logger: spyLogger }` instead.

## Why not AsyncLocalStorage

ALS appears attractive for "just make ctx ambient" but loses on:

- **Cross-platform**: ALS doesn't reliably exist in browsers / Cloudflare Workers / Deno
- **Discoverability**: function signature documents "this needs ctx"; ALS hides it
- **Testing**: pass a context object — vs wrap every test in `als.run({}, fn)`
- **Active concerns**: cancellation requires explicit `signal.aborted` checks anyway; ambient doesn't help
- **SoC**: infra reading ambient state means infra depends on a runtime concept (the ALS bound at HTTP mw) — leaky abstraction

OpenTelemetry uses ALS internally for trace propagation. When you add OTel later, you can:
- Let OTel manage trace context via its own ALS (you don't see it directly)
- Or expose `traceparent` in `Context` and bridge OTel ↔ Context at the boundary

Either path works without retrofitting your codebase.

## Why a single object vs per-field params

Adding new request-scoped data (e.g. `signal`):

- **Per-field params**: every method signature needs an extra arg. Every call site needs updating. Retrofit hell.
- **Context object**: one type change. Every existing signature already accepts ctx. Zero retrofit.

Trade-off: ctx is opaque at the type level — caller can't see which fields a method reads. Acceptable cost.

## Common mistakes

1. **Putting logger in `Deps`** — request logger varies per call, can't be bound at construction. If you must default a logger at construction time (for non-HTTP entrypoints), keep it as a fallback, but the request path still threads ctx.
2. **Reading process.env or globals inside adapter** — equivalent to ambient state. Pass via Deps (boot-time) or Context (per-call).
3. **Skipping `ctx` for a method that "doesn't need it today"** — costs you a future retrofit when the next field lands. Just take it.
4. **Not enriching the boundary logger** — middleware should call `baseLogger.withTag(service).withContext({ requestId, path })` so `ctx.logger` carries request data automatically.
