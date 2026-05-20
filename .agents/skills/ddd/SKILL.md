---
name: ddd
description: Hexagonal layout (domain/application/infrastructure), ports as TS types paired with Provider closures, factory-function adapters and use-cases, scope-split error codes, neverthrow `AsyncResult` (no throws below HTTP boundary), two-tier `iti` DI. Use when adding, modifying, or refactoring a port, adapter, use-case, domain entity, error code, DI wiring, middleware, or any code that performs I/O or calls an external API. Triggers: "add a port", "write an adapter", "implement a use case", "create an entity", "wire up X", "integrate with Saleor/S3/SQS/SSM", or changes under `src/domain/**`, `src/application/**`, `src/infrastructure/**`, `src/di/**`, or `src/apps/*/di/**`.
---

# DDD conventions

> Read every `references/*.md` before editing. When this `SKILL.md` and a reference disagree, **the reference wins**.

Three layers: **domain** (entities + ports + errors, pure) → **application** (use-case orchestration) → **infrastructure** (adapters). DI in `src/di/` (global) and `src/apps/<app>/di/` (per-app). Concrete adapters imported only from `di/` files. Every fallible function returns `AsyncResult<T, ScopeErrorCode>`.

## Layout

```
src/
├── domain/                  # pure, tech-free
│   ├── <aggregate>/<aggregate>.ts   # zod schema + named transitions
│   ├── context.ts                    # request-scoped Context type
│   ├── ports/<port>.ts               # Port + Provider TS types
│   ├── errors/scopes/<scope>.ts      # per-scope error code tuples
│   ├── errors/{base,result,format}.ts
│   └── use-case.ts                   # UseCase<I,O> type
├── application/
│   └── <action>-use-case.ts          # factory returns ({ ctx, ...input }) => AsyncResult
├── infrastructure/
│   ├── <port>/<vendor>/<vendor>-<port>.ts   # port-first
│   ├── <spec>/<concept>/                     # spec-scope (jose/jwks, jose/auth)
│   └── integrations/<vendor>/                # vendor-first (Saleor, Shopify)
├── di/container.ts                    # global — shared primitives
├── apps/<app>/{config.ts,di/container.ts,entry-server.ts}
└── lib/                               # generic utilities
```

## Provider pattern

Ports are paired with Providers. `ctx` flows through the Provider, not through every method param.

```typescript
// src/domain/ports/storage.ts
export type Storage = {
  get(key: string): AsyncResult<Uint8Array | null, StorageErrorCode>;
  // ... methods ctx-free
};

export type StorageProvider = (ctx: Context) => Storage;
```

**Adapter is two-phase**:

```typescript
// src/infrastructure/storage/s3/s3-storage.ts
export const createS3Storage = ({ location: bucket }: StorageOptions): StorageProvider => {
  const client = new S3Client();              // ← boot-time, cached across requests
  return (ctx) => ({                           // ← per-request closure binds ctx
    async get(key) { ctx.logger.debug(...); /* ... */ },
  });
};
```

**Consumer binds once**:

```typescript
async ({ ctx }: { ctx: Context }) => {
  const storage = storageProvider(ctx);        // bind once at top
  await storage.get("k");                       // method calls ctx-free
};
```

Heavy state (SDK clients) lives in the outer factory body — built once at DI boot, reused across requests. Inner closure is cheap (object literal). DI items hold Providers, not bound ports.

Full rationale (per-request DI vs Provider vs ALS, performance, testing): **[references/context.md](references/context.md)**.

## `UseCase` type

```typescript
// src/domain/use-case.ts
export type UseCase<TInput extends object = Record<string, never>, TOutput = unknown> = (
  input: TInput & { ctx: Context },
) => TOutput;
```

Single object input. Void-input → `{ ctx }`. Inputful → `{ ctx, ...fields }`. Never `useCase(undefined, ctx)`.

## Use-case shape

```typescript
type Deps = {
  catalogue: CatalogueProvider;          // ← Providers in Deps, not bound ports
  storage: StorageProvider;
};

export const generateFeedUseCase =
  ({ catalogue: catalogueProvider, storage: storageProvider }: Deps) =>
  async ({ ctx }: { ctx: Context }): AsyncResult<Summary, never> => {
    const catalogue = catalogueProvider(ctx);   // bind once
    const storage = storageProvider(ctx);
    // ... use catalogue / storage without ctx in calls
  };

export type GenerateFeedUseCase = ReturnType<typeof generateFeedUseCase>;
```

- File / factory / type / DI key all carry `-use-case` / `UseCase` suffix.
- `Deps` holds **Providers**, never bound ports. No `logger` in `Deps` — comes via `ctx`.
- Error union typed by scope. Compose unions across ports.

Inputful + boundary call + full procedure example: **[references/examples.md](references/examples.md)**.

## When NOT to create a port / use-case

- **N=1 trivial delegation** → inline into consumer.
- **N=1 multi-step + multiple errors** → **procedure file** under `integrations/<vendor>/`. NOT in DI. Positional `(input, ctx)` signature, binds providers internally.
- **N≥2 callers or domain orchestration** → full use-case in `application/`.
- **One-method "Service"** → plain function + function-typed alias (`FetchSaleorAppId`). No port.
- **`application/` may be empty** in protocol boilerplates.

Decision flow + folder pattern details: **[references/integrations.md](references/integrations.md)**.

## Domain entities

`src/domain/<aggregate>/<aggregate>.ts`: Zod schema + `z.infer` + **named pure transitions**, co-located. No methods, no classes. Parse at every untrusted boundary.

## Errors — scope-per-file

Codes split into `src/domain/errors/scopes/<scope>.ts`. `base.ts` aggregates into `ErrorCodes` union.

- One file per scope. Scope = consumer's narrowing surface.
- All codes end `_ERROR`.
- Adding code: append to scope tuple. Adding scope: create file + spread in `base.ts`.
- Re-map via `remapErrors(...)` when crossing scopes.

Full playbook (Error shape, `result.ts`, `remapErrors`, `DomainError`, HTTP handler): **[references/errors.md](references/errors.md)**.

## Result pattern

Every fallible path returns `AsyncResult<T, Code>`. House style: native `async` + `try/catch` + `return ok(...)` / `return err([...])`.

1. No `throw` below HTTP boundary.
2. Wrap external throwables in `try/catch`, translate to `err([...])`.
3. Compose with `await` + `if (.isErr()) return err(...)`. No chaining, no `safeTry`, no `yield*`.
4. `remapErrors` when crossing scope boundaries.
5. Unwrap only at edges (HTTP handlers, lambda entry, tests).

Banned APIs: `safeTry`, `ResultAsync.fromPromise`/`fromSafePromise`, `Result.fromThrowable`, `okAsync`/`errAsync`, `yield*` on Results, chain methods (`.andThen` / `.orElse` / `.asyncMap` / etc.).

Primitives + house style: **[references/neverthrow-api.md](references/neverthrow-api.md)**.

## DI — quick rules

Two tiers: `src/di/container.ts` (global factory, shared primitives) + `src/apps/<app>/di/container.ts` (per-app, merges global). Three ordered layers per container: primitives → adapters (return Providers) → use-cases.

```typescript
// src/apps/<app>/di/container.ts
export const container = createGlobalContainer(APP_CONFIG)
  .add({
    storage: () => createS3Storage({ location: APP_CONFIG.STORAGE_LOCATION }),  // StorageProvider
  })
  .add((ctx) => ({
    catalogue: () => createSaleorCatalogue({ ..., appConfigRepository: ctx.appConfigRepository }),
  }))
  .add((ctx) => ({
    generateFeedUseCase: () => generateFeedUseCase({
      catalogue: ctx.catalogue,    // Provider
      storage: ctx.storage,         // Provider
    }),
  }));
```

- DI items are **Providers** for ports, **bound use-case functions** for use-cases.
- Boundary touches `container.items.<x>UseCase({ ctx, ...input })` only — never adapters/ports directly.
- Use-case factories take Providers via `Deps`, bind internally.
- Shared orchestration → helper modules in `application/<slice>/`, never factory-in-factory.

Full layering, factory composition, access patterns: **[references/di.md](references/di.md)**.

## Boundary

Route handler reads logger from middleware (`ctx.logger`), constructs `Context`, calls use-case:

```typescript
const ctx = { logger: context.get("logger") };
const result = await container.items.generateFeedUseCase({ ctx });
```

`.match()` the Result, throw a `DomainError` subclass carrying typed `Error<Code>[]`. Single `errorHandler` registered via `app.onError(...)` serializes response. Switch must be exhaustive (`const _exhaustive: never = first.code`).

Full handler body, error subclass definitions: **[references/errors.md](references/errors.md)**.

## Top anti-patterns

Full list: **[references/anti-patterns.md](references/anti-patterns.md)**.

- ❌ Port method taking `ctx: Context` — methods are ctx-free; ctx flows via Provider.
- ❌ Adapter without two-phase factory — heavy state must live outside the per-request closure.
- ❌ `logger` in `Deps` — Context-only.
- ❌ Use-case as class with `.execute()` — must be factory function.
- ❌ Calling `useCase(undefined, ctx)` — single object `{ ctx, ...input }`.
- ❌ Concrete adapter import outside `src/di/**` or `src/apps/*/di/**`.
- ❌ `throw` below HTTP boundary.
- ❌ Domain importing from `application/`, `infrastructure/`, `di/`, or vendor SDKs.

## References

- [context.md](references/context.md) — Provider pattern, port/adapter/use-case/procedure shapes, ctx threading.
- [errors.md](references/errors.md) — scope split, `result.ts`, `remapErrors`, `DomainError`, handler.
- [di.md](references/di.md) — `iti` layering, factory wiring, boundary access.
- [examples.md](references/examples.md) — end-to-end worked example (port + adapter + use-case + DI + route + test).
- [integrations.md](references/integrations.md) — three folder patterns, integrations vs DI, plain fns vs services.
- [neverthrow-api.md](references/neverthrow-api.md) — primitives + house style.
- [anti-patterns.md](references/anti-patterns.md) — full list, grouped by area.
- External: [iti](https://itijs.org/), [neverthrow](https://github.com/supermacro/neverthrow#api-documentation).
