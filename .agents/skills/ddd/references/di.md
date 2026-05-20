# DI container (`iti`) patterns

Full docs: <https://itijs.org/>. Load when wiring new adapters or use-cases into any `di/container.ts`.

## Scope — two-tier layout

DI is split across two tiers:

- **Global** — `src/di/container.ts` exports `createGlobalContainer(config)` (factory, not instance). Returns a fresh `iti` container seeded with primitives that are **genuinely shared across multiple apps** (logger, storage adapter, scheduler adapter, job repository). Stays minimal. Factory shape is required: `iti`'s `.add()` mutates, and re-evaluating a per-app module under HMR / vite-dev-server would otherwise re-add tokens to the same shared instance and throw "Tokens already exist".
- **Per-app** — `src/apps/<app>/di/container.ts` exports `container`. Calls `createGlobalContainer(APP_CONFIG)` once, chains app-specific `.add(...)` layers on top.

Naming is deliberate: the global factory is named `createGlobalContainer` because cross-app reach is something you want to see in code review. Per-app `container` lives at a fixed path inside the app, so callers always see `import { container } from "./di/container.ts"` — the path supplies the namespace, the name stays generic.

**Concrete adapter factory imports** (`createS3Storage`, `createSaleorProductCatalogue`, `createLambdaScheduler`, etc.) **are allowed ONLY under `src/di/**`and`src/apps/\*/di/**`.** Domain, application, infrastructure-of-other-adapters, and entry-servers depend on **port types**, never on adapter factories.

Why: each app deploys as its own Lambda with its own env requirements. Per-app containers keep one app's config from leaking into another's boot path. The global tier exists for things truly common — push everything else down to the per-app tier.

## Container is an exported const

Each container is built once at module load and exported as a `const` — never a `build...()` function invoked at call sites. Inside an app, consumers import the local `container` from `./di/container.ts` and read `container.items.xxx`. Never reach into the global factory from app code outside the per-app `di/container.ts`.

```typescript
// ✅ src/di/container.ts (global) — factory, not instance
import { createContainer } from "iti";

import type { JobRepository } from "@/domain/ports/job-repository.ts";
import type { JobScheduler } from "@/domain/ports/job-scheduler.ts";
import type { Storage } from "@/domain/ports/storage.ts";
import { createJobRepository } from "@/infrastructure/job-repository/job-repository.ts";
import { createLambdaScheduler } from "@/infrastructure/scheduler/lambda-scheduler.ts";
import { createLocalScheduler } from "@/infrastructure/scheduler/local-scheduler.ts";
import { createFileStorage } from "@/infrastructure/storage/file-storage.ts";
import { createS3Storage } from "@/infrastructure/storage/s3-storage.ts";
import { getLogger } from "@/providers/logging.ts";

export const createGlobalContainer = (config: GlobalContainerConfig) =>
  createContainer()
    .add({
      logger: () => getLogger({ service: config.SERVICE }),
      stateKey: () => config.STATE_KEY,
      storageLocation: () => config.STORAGE_LOCATION,
      generatorTarget: () => config.GENERATOR_TARGET,
    })
    .add((ctx) => ({
      storage: (): Storage =>
        config.IS_DEVELOPMENT
          ? createFileStorage(ctx.storageLocation)
          : createS3Storage(ctx.storageLocation),
      scheduler: (): JobScheduler =>
        isHttpUrl(ctx.generatorTarget)
          ? createLocalScheduler(ctx.generatorTarget)
          : createLambdaScheduler({ functionName: ctx.generatorTarget }),
    }))
    .add((ctx) => ({
      jobs: (): JobRepository => createJobRepository({ storage: ctx.storage, key: ctx.stateKey }),
    }));

// ✅ src/apps/handler/di/container.ts (per-app)
import { getGenerationStatusUseCase } from "@/application/get-generation-status.ts";
import { startGenerationUseCase } from "@/application/start-generation-use-case.ts";
import { createGlobalContainer } from "@/di/container.ts";

import { APP_CONFIG } from "../config.ts";

export const container = createGlobalContainer(APP_CONFIG).add((ctx) => ({
  getGenerationStatusUseCase: () => getGenerationStatusUseCase({ jobs: ctx.jobs }),
  startGenerationUseCase: () =>
    startGenerationUseCase({
      jobs: ctx.jobs,
      scheduler: ctx.scheduler,
      logger: ctx.logger,
    }),
}));

// ✅ src/apps/handler/api/rest/generation/routes.ts (boundary)
import { container } from "@/apps/handler/di/container.ts";

const result = await container.items.startGenerationUseCase();
```

Anti-pattern: exporting `buildContainer()` / `buildHandlerContainer()` forces every consumer to instantiate its own graph, breaks singleton semantics (each call re-constructs AWS clients, loggers, etc.), and loses iti's lazy caching.

## Entry shape

Every entry is a zero-arg factory. `iti` invokes it lazily and caches the result per container.

```typescript
.add({
  logger: () => buildLogger(),         // singleton
  stateKey: () => "state.json",        // raw value via factory
});
```

For adapter/use-case factories, the entry wires the factory call:

```typescript
.add((ctx) => ({
  storage: () => createS3Storage(ctx.storageLocation),     // adapter factory call
  startGenerationUseCase: () =>
    startGenerationUseCase({                                       // use-case factory call
      jobs: ctx.jobs,
      scheduler: ctx.scheduler,
      logger: ctx.logger,
    }),
}));
```

`iti` caches the **return value** of the entry factory. So `startGenerationUseCase: () => startGenerationUseCase({...})` caches the bound use-case function (the inner curried function) — exactly what callers consume via `container.items.startGenerationUseCase`.

## Layered `.add((ctx) => ...)`

Each layer sees previous entries through `ctx`. Layer ordering is fixed:

1. **Primitives** — raw config values, `logger`.
2. **Adapters** — `createXxxAdapter(deps)` calls. Yield port-typed values.
3. **Use-cases** — `xxxUseCase(deps)` factory calls. Yield bound use-case functions.

Never skip or merge layers — adapters can depend on primitives, use-cases can depend on adapters and primitives, but adapters must not depend on use-cases.

```typescript
const container = createGlobalContainer(APP_CONFIG)
  .add({
    batchPageSize: () => APP_CONFIG.BATCH_PAGE_SIZE,
    channels: () => channelsFromMap(APP_CONFIG.CHANNEL_PATH_MAP),
    saleorClient: () => baseSaleorClientFactory({ saleorDomain: APP_CONFIG.SALEOR_DOMAIN }),
  })
  .add((ctx) => ({
    productCatalogue: () =>
      createSaleorProductCatalogue({
        client: ctx.saleorClient,
        batchPageSize: ctx.batchPageSize,
      }),
  }))
  .add((ctx) => ({
    crawlProductsUseCase: () =>
      crawlChannelScopedUseCase(
        { ...sharedCrawlDeps(ctx), catalogue: ctx.productCatalogue },
        PRODUCTS_CRAWL_CONFIG,
      ),
  }));
```

## Singleton vs parameterized factory

### Singleton (default)

```typescript
storage: () => createS3Storage(ctx.bucket),
```

Access via `container.items.storage`. One instance per container lifetime.

### Parameterized factory

When the value needs **per-request** input (auth tokens, request-scoped client, per-tenant config), expose a factory that takes an options object:

```typescript
saleorClientFactory: () =>
  ({ authToken }: { authToken: string }) =>
    baseSaleorClientFactory({
      saleorDomain: ctx.saleorDomain,
      authToken,
    }),
```

- Outer function = iti entry. Returns a function.
- Inner function = what the caller invokes with request-scoped input.
- **Always suffix `Factory`** when the entry returns a function the caller still needs to call.

Use this sparingly. Most things in this codebase are container-time singletons.

## Accessing the container

| Pattern                     | When                                                         |
| --------------------------- | ------------------------------------------------------------ |
| `container.items.xxx`       | Default. Sync, cached. Use in HTTP handlers, lambda handler. |
| `container.get("xxx")`      | Only when the entry is declared `async`.                     |
| `container.getItems([...])` | Rarely needed — destructure from `.items` instead.           |

```typescript
// Use-case invocation at the boundary
const result = await container.items.startGenerationUseCase();

// Or destructure many at once (generator handler)
const {
  determineStep,
  initGeneration,
  crawlStatic,
  crawlPages,
  // ...
} = container.items;
```

Note: `container.items.startGenerationUseCase` is **already the bound function**, not a factory needing a deps argument. The factory was called at container build time; the cached result is the curried `() => AsyncResult<...>`.

## Per-invocation inputs into use-cases

If a use-case needs a per-call value that is NOT one of its DI deps (e.g. lambda's `getRemainingTimeInMillis` for budget checking), pass it as **input to the bound function**, not into the factory:

```typescript
// Use-case factory closes over the static deps. The bound function takes a
// single object: per-call input fields + `ctx`.
export const crawlChannelScopedUseCase = (deps: Deps, config: Config) =>
  async ({
    ctx,
    job,
    shouldContinue,
  }: {
    job: GenerationJob;
    shouldContinue: () => boolean;
    ctx: Context;
  }): AsyncResult<...> => { /* ... */ };

// DI wires once:
.add((ctx) => ({
  crawlProductsUseCase: () =>
    crawlChannelScopedUseCase({ ...sharedCrawlDeps(ctx), catalogue: ctx.productCatalogue }, PRODUCTS_CRAWL_CONFIG),
}));

// Boundary supplies the per-invocation values:
const shouldContinue = () => context.getRemainingTimeInMillis() > APP_CONFIG.SAFETY_MS;
await container.items.crawlProductsUseCase({ ctx, job: step.job, shouldContinue });
```

Rule of thumb: if the value comes from a **port or static config**, it's a `Dep` (factory closure). If it comes from **the boundary's runtime invocation context**, it's an `Input` (function argument).

## Composing helpers across use-cases

Several use-cases share orchestration logic (pagination loop, write-chunk + save-job + trigger-next). Compose via **shared helper modules** in `src/application/<slice>/`, not via factories-calling-factories:

```typescript
// src/application/crawl/crawl-loop.ts — pure helper
export const runCrawlLoop = async <TCheckpoint, TError extends ErrorCode>({
  shouldContinue,
  isExhausted,
  initial,
  step,
}: {
  /* ... */
}): AsyncResult<CrawlLoopResult<TCheckpoint>, TError> => {
  /* ... */
};

// src/application/crawl/crawl-channel-scoped.ts — use-case using the helper
export const crawlChannelScopedUseCase =
  (deps: Deps, config: Config) =>
  async ({ job, shouldContinue }) => {
    // ...
    const loopResult = await runCrawlLoop({ shouldContinue, isExhausted, initial, step });
    // ...
  };
```

DI wires the use-cases, not the helpers. Helpers are imported normally.

## Testing

- **Prefer testing use-cases directly** with `MagicMock<Port>()` for each port dep. Pass mocks into the factory, invoke the bound function. No container coupling.
- When an integration test needs the real graph, build a **test container** that mirrors production but swaps adapter factories for in-memory ones.
- Never mutate the production `container` from a test.

```typescript
import { startGenerationUseCase } from "@/application/start-generation-use-case.ts";
import type { JobRepository } from "@/domain/ports/job-repository.ts";
import type { JobScheduler } from "@/domain/ports/job-scheduler.ts";
import { MagicMock } from "@/lib/test/mock.ts";

const jobs = MagicMock<JobRepository>();
const scheduler = MagicMock<JobScheduler>();
const logger = MagicMock<LoggingProvider>();

vi.mocked(jobs.load).mockResolvedValue(ok(null));
vi.mocked(scheduler.triggerNext).mockResolvedValue(ok(undefined));

const start = startGenerationUseCase({ jobs, scheduler, logger });
const result = await start();

expect(result.isOk()).toBe(true);
expect(scheduler.triggerNext).toHaveBeenCalledOnce();
```

## Anti-patterns

- ❌ `container.items.xxx` inside an adapter / use-case / domain entity.
- ❌ Adapter in layer 3 or use-case in layer 2 — breaks layering.
- ❌ Concrete adapter factory call outside `src/di/**` or `src/apps/*/di/**`.
- ❌ Use-case factory calling another use-case factory inside its body — extract shared logic to a helper module both call.
- ❌ Missing `Factory` suffix on a parameterized factory entry that returns a function the caller still needs to call.
- ❌ Renaming the per-app export from `container` to `<app>Container` — the file path provides the namespace.
- ❌ Pushing app-specific config / adapters into the global tier just because "it could be shared one day". Wait until the second app actually needs it.
- ❌ Container takes per-invocation state as a build argument — use parameterized factory entries or pass via the use-case's input arg.
- ❌ `new XxxClass(...)` in a DI binding — adapters are factory functions, not classes. (Vendor SDK classes like `S3Client` are fine _inside_ the adapter factory.)
