---
name: ddd
description: Enforce hexagonal layout, ports & adapters, function-shaped use-cases, scope-split errors, and the Result pattern (`neverthrow`) for this application. Domain types live in `src/domain/**` (entities with pure transitions + ports as TS types + per-scope error code files), adapters in `src/infrastructure/**` (factory functions returning port-shaped objects), use-cases in `src/application/**` (factory functions returning curried handlers). DI (`iti`) is two-tier — `src/di/container.ts` (global, shared primitives only) and `src/apps/<app>/di/container.ts` (per-app, merges global). Every fallible function returns `AsyncResult<T, ScopeErrorCode>` instead of throwing. Use whenever the user asks to add, modify, or refactor a port, adapter, use-case, domain entity, error code, DI wiring, or code that performs I/O or calls an external API — even without words like "DDD", "Result", or "use case". Triggers: "add a port", "write an adapter", "implement a use case", "create an entity", "wire up X", "integrate with Saleor/S3/SQS", or any change under `src/domain/**`, `src/application/**`, `src/infrastructure/**`, `src/di/**`, or `src/apps/*/di/**`.
---

# DDD conventions (hexagonal, functional core)

> **Read every `references/*.md` before editing.** When this `SKILL.md` and a reference disagree, **the reference wins** — this file is a summary, references are authoritative.

Three layers: **domain** (entities + ports + errors, all pure) → **application** (use-case orchestration as factory functions) → **infrastructure** (adapters as factory functions). DI containers in `src/di/` (global — shared primitives only) and `src/apps/<app>/di/` (per-app, merges global). Files under those `di/` folders are the **only** ones allowed to import concrete adapter factories. Every fallible function returns `AsyncResult<T, ScopeErrorCode>`; nothing throws below the HTTP boundary.

## Layout

```
src/
├── domain/                              # pure, tech-free
│   ├── <aggregate>/                     # e.g. job/
│   │   ├── <aggregate>.ts               # zod schema + named transitions
│   │   ├── <subdomain>.ts               # value-object helpers, phase logic, etc.
│   │   └── <aggregate>.test.ts
│   ├── ports/                           # contracts (TS types, NOT abstract classes)
│   │   └── <port>.ts                    # e.g. job-repository.ts, storage.ts
│   ├── errors/
│   │   ├── base.ts                      # aggregates all scopes into ErrorCodes union + Error<T>
│   │   ├── result.ts                    # AsyncResult, helpers
│   │   ├── format.ts                    # ErrorCodeFormat literal type
│   │   └── scopes/                      # ONE FILE PER SCOPE
│   │       └── <scope>.ts               # e.g. crawl.ts, storage.ts, catalogue.ts
│   └── use-case.ts                      # type UseCase<I,O> = (i:I) => O
├── application/                         # use-cases (factory functions)
│   ├── <action>-use-case.ts             # e.g. start-generation-use-case.ts
│   └── <slice>/                         # cross-cutting compositions
│       ├── <action>-use-case.ts         # e.g. crawl-channel-scoped-use-case.ts
│       ├── <slice>-loop.ts              # reusable building blocks (NO suffix)
│       ├── <slice>-shared.ts            # shared helpers — writeChunk etc. (NO suffix)
│       └── configs.ts                   # per-instance config objects (NO suffix)
├── infrastructure/                      # adapters (factory functions)
│   ├── <port>/<vendor>/<vendor>-<port>.ts   # PORT-FIRST — e.g. app-config/aws/aws-secret-manager-app-config-repository.ts
│   ├── <spec>/<concept>/<file>.ts           # SPEC-SCOPE — e.g. jose/jwks/, jose/jwt/, jose/auth/ (RFC families)
│   └── integrations/<vendor>/<concern>/     # VENDOR-FIRST — e.g. integrations/saleor/{install,webhook,client,graphql}/
├── di/container.ts                      # GLOBAL — primitives only
├── apps/
│   └── <app>/
│       ├── config.ts                    # app-scoped env validation
│       ├── di/container.ts              # per-app — merges global + app factories
│       └── entry-server.ts
└── lib/                                 # generic utilities, no domain knowledge
```

- **Depend inward only.** `domain/` never imports `application/`, `infrastructure/`, `di/`, or vendor SDKs. `application/` imports `domain/` only. `infrastructure/` imports `domain/` only.
- **Concrete-adapter importers are only `src/di/**`and`src/apps/*/di/**`.** Application code depends on port *types\*, never on `createSaleorCatalogue` or `createS3Storage` directly.
- Per-app DI containers merge global (`createGlobalContainer(APP_CONFIG)`) and add what the app needs — keeps each Lambda's env requirements scoped to its own slice.
- The global container hosts only **genuinely shared** primitives (logger, storage, scheduler, repository). Avoid pushing app-specific config there.
- **Vendor subfolder per adapter** under the port folder: `infrastructure/<port>/<vendor>/<vendor>-<port>.ts`. Examples: `infrastructure/storage/s3/s3-storage.ts`, `infrastructure/jwks/jose/jose-jwks-repository.ts`, `infrastructure/logging/ts-log/ts-logger.ts`. The vendor folder isolates vendor-specific helpers (graphql docs, schemas, native bindings) alongside the adapter; the file keeps the vendor prefix for grep + AI navigation.
- Shared port-level utilities (types, redaction helpers) live at the port folder root (`infrastructure/<port>/types.ts`), not inside any vendor folder.
- Use-case **filenames + factory exports + bound types + DI keys** all carry the `use-case` / `UseCase` suffix:
  - File: `src/application/start-generation-use-case.ts` (kebab `-use-case`).
  - Factory: `export const startGenerationUseCase = ...`.
  - Bound type: `export type StartGenerationUseCase = ReturnType<typeof startGenerationUseCase>`.
  - DI key: `container.items.startGenerationUseCase`.
  - **Helper modules in `application/<slice>/`** (loops, shared utilities, configs) do NOT carry the suffix — they're not use-cases.
  - Reason: AI-navigation + grep. `find . -name '*-use-case*'` and `grep -r 'UseCase'` both land on the layer.

## `UseCase` type

`src/domain/use-case.ts`:

```typescript
export type UseCase<TInput = void, TOutput = unknown> = (input: TInput) => TOutput;
```

A use-case is a function. It is produced by a **factory function** that closes over its dependencies. The factory is exported; the returned function type is also exported for consumers that need to type it.

## Use-case shape

```typescript
// src/application/start-generation-use-case.ts
import { err, ok } from "neverthrow";

import type { AsyncResult } from "@/domain/errors/result.ts";
import type { GenerationControlErrorCode } from "@/domain/errors/scopes/generation-control.ts";
import type { GenerationStateErrorCode } from "@/domain/errors/scopes/generation-state.ts";
import type { SelfInvokerErrorCode } from "@/domain/errors/scopes/self-invoker.ts";
import { findActiveJob } from "@/domain/job/job.ts";
import type { JobRepository } from "@/domain/ports/job-repository.ts";
import type { JobScheduler } from "@/domain/ports/job-scheduler.ts";
import type { LoggingProvider } from "@/lib/logging/types.ts";

type Deps = {
  jobs: JobRepository;
  scheduler: JobScheduler;
  logger: LoggingProvider;
};

export type StartGenerationErrorCode =
  | GenerationControlErrorCode
  | GenerationStateErrorCode
  | SelfInvokerErrorCode;

export const startGenerationUseCase =
  ({ jobs, scheduler, logger }: Deps) =>
  async (): AsyncResult<void, StartGenerationErrorCode> => {
    const loadResult = await jobs.load();
    if (loadResult.isErr()) return err(loadResult.error);

    const active = findActiveJob(loadResult.value);
    if (active !== null) {
      return err([
        {
          code: "GENERATION_CONTROL_ACTIVE_JOB_ERROR",
          message: "Cannot start: an active job is already running.",
          details: { jobId: active.jobId, phase: active.phase },
        },
      ]);
    }

    logger.info("CONTROL: triggering manual generation start.");

    const triggerResult = await scheduler.triggerNext();
    if (triggerResult.isErr()) return err(triggerResult.error);

    return ok(undefined);
  };

export type StartGenerationUseCase = ReturnType<typeof startGenerationUseCase>;
```

- Factory takes `Deps` (a `type` containing port-typed dependencies). Closes over them.
- Returns the use-case function. Caller calls `useCase(input)` — **no `.execute()`**.
- Export both the factory (`startGenerationUseCase`) and the bound type (`StartGenerationUseCase`) — `UseCase` suffix on both. The verb-only name (`startGeneration`) is reserved for domain transitions or pure helpers.
- Error union typed by scope, never literal. Compose unions across multiple ports.

## Ports

`src/domain/ports/` — **TS types**, not abstract classes:

```typescript
// src/domain/ports/storage.ts
export type Storage = {
  get(key: string): AsyncResult<Uint8Array | null, StorageErrorCode>;
  put(input: StoragePutInput): AsyncResult<{ written: boolean }, StorageErrorCode>;
  delete(key: string): AsyncResult<void, StorageErrorCode>;
  // ...
};
```

- Port type lives in `domain/ports/<port>.ts`. One port per file. Filename = the port's role, no `-service` / `-port` suffix.
- Port hides implementation knobs (S3 bucket names, GraphQL edge shapes, AWS exceptions). Domain consumers must work against the port alone.
- A port leaks if its method signatures force callers to think in adapter terms (cursors typed as Saleor strings, error details containing AWS metadata). Re-shape until the leak is gone.

## Adapters

`src/infrastructure/<port>/<vendor>/<vendor>-<port>.ts` — **factory functions** returning port-shaped objects. The vendor subfolder isolates vendor-specific helpers (SDK docs, schemas, generated GraphQL, native bindings) alongside the adapter:

```
src/infrastructure/
├── storage/
│   ├── s3/
│   │   ├── s3-storage.ts
│   │   └── s3-storage.test.ts
│   └── file/
│       └── file-storage.ts
├── jwks/jose/jose-jwks-repository.ts
├── logging/
│   ├── ts-log/ts-logger.ts
│   ├── types.ts                 # shared LogLevel + LOG_LEVEL_MAP
│   └── utils.ts                 # shared redaction
```

```typescript
// src/infrastructure/storage/s3/s3-storage.ts
export const createS3Storage = (bucket: string): Storage => {
  const client = new S3Client();
  return {
    async get(key) {
      /* ... */
    },
    async put({ key, body, ifAbsent }) {
      /* ... */
    },
    // ...
  };
};
```

- Factory returns the port type explicitly: `(...): Storage =>`. Lets TS verify shape at the boundary.
- Wrap external throwables with plain `try/catch` and translate to `err([...])`. Never re-throw.
- One implementation per vendor folder. Multiple impls = multiple vendor folders (`s3/s3-storage.ts`, `file/file-storage.ts`).
- Port-level shared utilities (types, helpers consumed by multiple vendors) live at the port folder root — never inside a vendor folder.
- **Three folder patterns coexist** — port-first (`<port>/<vendor>/`), spec-scope (`<standard>/<concept>/`), vendor-first (`integrations/<vendor>/`). Full criteria + integration playbook: **[references/integrations.md](references/integrations.md)**.
- **Vendor-first lives under `integrations/<vendor>/`** for proprietary protocols (Saleor install handshake, webhook verification, client calls, GraphQL ops, schemas). All vendor concerns cluster — easier "find everything Saleor" navigation.
- **Spec-scope** for IETF/RFC families (e.g. `infrastructure/jose/{jwks,jwt,auth}/`). Folder name = the standard, not the lib. Drop lib-prefix on filenames since folder context says it.

## When NOT to create a port / use-case

Skill bias toward ports + use-cases + the `UseCase` suffix is for **domain orchestration**. Boilerplate / integration-only services often need less.

Rules:

- **N=1 caller + trivial delegation** → collapse into the consumer. Saleor webhook verify is a single delegation (verify signature + remap error) → inline into Hono mw, no use-case file, no scope codes for a one-step verify.
- **N=1 caller + multi-step orchestration with multiple distinct error codes** → keep as a **procedure file** under the relevant folder (e.g. `integrations/saleor/install/saleor-install.ts`). NOT registered in DI. Compose inline in the calling route. Returns `AsyncResult<T, ScopeErrorCode>` like a use-case, but isn't promoted to `application/` since there's no domain orchestration.
- **N≥2 callers, or domain logic, or genuine orchestration over domain entities** → full use-case in `application/` with DI key + `UseCase` suffix.
- **One-method "Service"** → ❌ function in tuxedo. Export as plain function (`fetchSaleorAppId`) with a function-typed alias (`FetchSaleorAppId`). Inject as function dep. Tests pass plain async fns.
- **`application/` may be empty** in pure-protocol boilerplates. Don't manufacture use-cases for protocol handlers — those live in `infrastructure/integrations/<vendor>/`.

Decision flow: domain logic? → `application/` use-case. Pure protocol? → `infrastructure/integrations/<vendor>/`. One step? → function. Many steps + many errors? → procedure file.

Integration composition (DI vs call-site, factory-of-instance, schemas, naming): **[references/integrations.md](references/integrations.md)**.

## Domain entities

`src/domain/<aggregate>/<aggregate>.ts`. **Always Zod schema + `z.infer` + named pure transitions** co-located:

```typescript
// src/domain/job/job.ts
import z from "zod";
import { generationPhaseSchema, nextGenerationPhase } from "./phase.ts";

export const generationJobSchema = z.object({
  jobId: z.uuid(),
  startedAt: z.coerce.date(),
  phase: generationPhaseSchema,
  invocationCount: z.number().int().nonnegative(),
  cursor: z.string().nullable(),
  channel: z.string().nullable(),
});

export type GenerationJob = z.infer<typeof generationJobSchema>;

export const startNewJob = ({ jobId, now }: { jobId: string; now: Date }): GenerationJob => ({
  jobId,
  startedAt: now,
  phase: "INIT",
  invocationCount: 0,
  cursor: null,
  channel: null,
});

export const advancePhase = (job: GenerationJob): GenerationJob | null => {
  const next = nextGenerationPhase(job.phase);
  if (next === null) return null;
  return { ...job, phase: next, cursor: null, channel: null };
};

export const recordBatch = (
  job: GenerationJob,
  { cursor, channel }: { cursor: string | null; channel: string | null },
): GenerationJob => ({ ...job, cursor, channel, invocationCount: job.invocationCount + 1 });
```

- Zod schema is source of truth. Never hand-write a TS `type`/`interface` parallel to the schema.
- **Named transitions** (`startNewJob`, `advancePhase`, `recordBatch`) are pure functions over the entity record. No methods, no classes. Co-locate with the schema.
- Use-cases call transitions; they never mutate entity fields inline (`{ ...state, invocationCount: state.invocationCount + 1 }` is a smell — extract to `recordBatch`).
- Parse at every untrusted boundary (storage reads, queue messages, API responses) via `.parse` / `.safeParse`.
- Pure helpers only — no `infrastructure/`, `di/`, vendor SDK imports.

## Errors — scope-per-file split

Codes split into per-scope files at `src/domain/errors/scopes/<scope>.ts`. `base.ts` aggregates them into the `ErrorCodes` union.

```typescript
// src/domain/errors/scopes/crawl.ts
import type { ErrorCodeFormat } from "../format.ts";

export const CRAWL_ERROR_CODES = [
  "CRAWL_STATIC_BUILD_ERROR",
  "CRAWL_STATIC_WRITE_ERROR",
  "CRAWL_PRODUCTS_FETCH_ERROR",
  // ...
] as const satisfies readonly ErrorCodeFormat[];
export type CrawlErrorCode = (typeof CRAWL_ERROR_CODES)[number];
```

```typescript
// src/domain/errors/base.ts
import { CATALOGUE_ERROR_CODES } from "./scopes/catalogue.ts";
import { CRAWL_ERROR_CODES } from "./scopes/crawl.ts";
// ...

export const ErrorCodes = [
  ...CATALOGUE_ERROR_CODES,
  ...CRAWL_ERROR_CODES,
  // ...
] as const;
export type ErrorCode = (typeof ErrorCodes)[number];
```

- **One file per scope.** Don't pile codes into `base.ts`. Scope file owns its constant tuple and emits the scope type.
- **Scope = consumer's surface**, not adapter's surface. `CRAWL_*` exists because crawl use-cases want a narrow union to return; the underlying storage error gets `remapErrors(...)`-ed to the crawl scope at the use-case edge.
- Per-use-case scopes (`InitGenerationErrorCode`, `FinalizeGenerationErrorCode`) are encouraged when the use-case has distinct failure modes worth narrowing.
- All codes end with `_ERROR` (enforced by `ErrorCodeFormat`).
- Adding a code: append to the matching scope tuple. Adding a scope: create `scopes/<new>.ts`, import + spread in `base.ts`.

Full playbook (Error shape, `result.ts` helpers, `remapErrors`, `DomainError` boundary, global handler): **[references/errors.md](references/errors.md)**.

## Result pattern (`neverthrow`)

Every fallible path returns `Result` / `ResultAsync`. `throw` only at HTTP boundary. **House style: native `async` + `try/catch` + `return ok(...)` / `return err([...])`.**

1. Never `throw` in domain/application/infrastructure. Return `err([...])`.
2. Wrap external throwables at the edge with **plain `try/catch`** — translate the caught throwable into a typed `Error<Code>` and return `err([...])`.
3. Return type is `AsyncResult<T, Code>`. Function is `async fn(): AsyncResult<...>`.
4. Compose by `await`ing each call and **early-returning on `.isErr()`** — no chaining, no `safeTry`, no `yield*`.
5. Re-map error codes when crossing scope boundaries using `remapErrors(...)` from `domain/errors/result.ts`.
6. Unwrap only at edges (HTTP handlers, lambda entry, tests).

Banned APIs (do not use in new code): `safeTry`, `ResultAsync.fromPromise`, `ResultAsync.fromSafePromise`, `Result.fromThrowable`, `ResultAsync.fromThrowable`, `okAsync`, `errAsync`, `yield*` on Results, chain methods (`.andThen` / `.orElse` / `.asyncMap` / `.asyncAndThen`).

Primitives cheatsheet + full house-style rules + ban list: **[references/neverthrow-api.md](references/neverthrow-api.md)**.

## DI — quick rules

DI lives in two tiers: `src/di/container.ts` (global — exports `createGlobalContainer()` factory, shared primitives only) and `src/apps/<app>/di/container.ts` (per-app — exports `container`, calls the factory then chains app-specific layers). The global tier is a factory not an instance because `iti`'s `.add()` mutates and HMR-driven re-evaluation would otherwise re-register tokens.

**Three ordered layers** within each container:

1. **Primitives** (logger, config values).
2. **Adapters** — call adapter factories: `storage: () => createS3Storage(ctx.bucket)`.
3. **Use-cases** — call use-case factories: `startGenerationUseCase: () => startGenerationUseCase({ jobs: ctx.jobs, ... })`.

```typescript
// src/di/container.ts (global)
export const createGlobalContainer = (config: GlobalContainerConfig) =>
  createContainer()
    .add({ logger: () => getLogger(...), /* primitives */ })
    .add((ctx) => ({
      storage: (): Storage =>
        config.IS_DEVELOPMENT
          ? createFileStorage(ctx.storageLocation)
          : createS3Storage(ctx.storageLocation),
      scheduler: (): JobScheduler => /* ... */,
    }))
    .add((ctx) => ({
      jobs: (): JobRepository =>
        createJobRepository({ storage: ctx.storage, key: ctx.stateKey }),
    }));

// src/apps/handler/di/container.ts (per-app)
export const container = createGlobalContainer(APP_CONFIG)
  .add((ctx) => ({
    startGenerationUseCase: () =>
      startGenerationUseCase({ jobs: ctx.jobs, scheduler: ctx.scheduler, logger: ctx.logger }),
  }));
```

- DI binding values are **functions returning the wired use-case/adapter**, not the adapter itself (`iti` calls them lazily).
- Access at boundary via `container.items.startGenerationUseCase` — that yields the **bound function**, call it directly: `await container.items.startGenerationUseCase()`.
- **DI key matches the factory name**, including the `UseCase` suffix.

**Boundary access rules:**

- Boundary code (entry-server, lambda handler, route) reaches into `container.items.<x>UseCase` (a use-case function) **only**. It does not touch adapters or ports directly — that is the use-case's job.
- Use-case factories inject **port-typed deps** through `Deps`. They never construct adapters themselves. They do not call other use-case factories.
- Need to coordinate across phases / sub-flows? Compose via **shared helper modules** (e.g. `application/crawl/crawl-loop.ts`, `crawl-shared.ts`). One outer use-case factory wires the helpers with its own deps. **No inheritance.**

Full layering, factory composition, access patterns: **[references/di.md](references/di.md)**.

## Boundary — quick rules

Route `.match()`s the Result and throws a `DomainError` subclass carrying typed `Error<Code>[]`. Single `errorHandler` registered with `app.onError(...)` serializes response. Subclasses: `DomainValidationError` (400), `DomainUnauthorizedError` (401), `DomainNotFoundError` (404), fallback `new DomainError(status, errors)`. Switch must be exhaustive (`const _exhaustive: never = first.code`).

Full handler body, class definitions: **[references/errors.md](references/errors.md)**.

## Anti-patterns

- ❌ `abstract class` for a port — use `type`.
- ❌ Port-implementing class in `infrastructure/` (`class S3Storage implements Storage`) — use factory function (`createS3Storage(...): Storage`).
- ❌ Flat adapter file `infrastructure/<port>/<vendor>-<port>.ts` without vendor subfolder — must be `infrastructure/<port>/<vendor>/<vendor>-<port>.ts`. Vendor folder isolates vendor-specific helpers (SDKs, generated code, schemas).
- ❌ Vendor-specific helpers at the port folder root (`infrastructure/storage/s3-helpers.ts`) — move into the vendor folder. Only port-level shared utilities (types, redaction) live at the root.
- ❌ Use-case as class with `.execute()` — must be factory function returning a curried handler.
- ❌ Port with one method (`type StoreService = { getAppId(...) }`) — collapse to plain function + function-typed alias. Service wrapping single op = function in tuxedo. (See [integrations.md](references/integrations.md).)
- ❌ Use-case file for N=1 trivial delegation (single-step wrap of one port call) — collapse into consumer or use a plain procedure file under `integrations/<vendor>/`.
- ❌ Registering `integrations/<vendor>/` code in DI — vendor procedures composed at call site. Global container = generic primitives only.
- ❌ Per-vendor DI keys (`saleorInstall`, `shopifyInstall`) bloating global container — pull vendor composition out, expose only the cross-vendor primitives the integration consumes.
- ❌ "AppConfig" type in `domain/` with vendor-flavored fields (`saleorDomain`, `saleorApiUrl`) — move schema to `infrastructure/integrations/<vendor>/app-config/schema.ts`. Domain stays vendor-neutral.
- ❌ Schema for vendor protocol body in `domain/` — co-locate with the integration concern (`integrations/saleor/install/schema.ts`, `integrations/saleor/webhook/schema.ts`).
- ❌ Boolean variant flag (`verifyJWS({ ..., detached: boolean })`) — split into two methods (`verifyJWS` + `verifyJWSDetached`). Boolean = code smell.
- ❌ Variant prefix (`verifyDetachedJWS`) — use suffix (`verifyJWSDetached`) so variants group with base name in autocomplete/sort.
- ❌ Generic error code prefix that hides emitter (`STORE_REQUEST_ERROR` when only Saleor emits it) — prefix with emitter name (`SALEOR_REQUEST_ERROR`). Scope file mirrors emitter (`scopes/saleor.ts`).
- ❌ `__var` / `_var` prefix inside factory functions — closures already enforce privacy. Pure noise.
- ❌ Helper for single-element `err([...])` — keeps array shape visible, avoid hiding the contract.
- ❌ `config/index.ts` folder with only one file — flatten to `config.ts`. Folder earns its keep with multiple files.
- ❌ Mixing env config (`config.ts`) and tenant app-config schema (`app-config.ts`) in same file — env vars vs persisted tenant data are different concepts.
- ❌ Inheritance in `application/` (`class ChannelScopedCrawl extends CatalogueCrawl`) — compose via shared helper modules.
- ❌ Concrete adapter import outside `src/di/**`, `src/apps/*/di/**` — application/use-cases depend on the port _type_ only.
- ❌ Use-case factory calling another use-case factory inside — extract shared logic to a helper module both call.
- ❌ Boundary code (entry-server / route) calling adapters or ports directly — touch `container.items.<useCase>(...)` only.
- ❌ Domain importing `application/`, `infrastructure/`, `di/`, or vendor SDKs.
- ❌ Adding _methods_ to a domain entity — define **named transition functions** at the entity's module level.
- ❌ Inline state-mutation in use-case (`{ ...job, invocationCount: job.invocationCount + 1 }`) when a transition like `recordBatch` exists — call the transition.
- ❌ Hand-writing TS `interface`/`type` for a domain object — schema first via `z.infer`.
- ❌ Path under `src/application/domain/` or `src/application/infrastructure/` — those locations are dead; entities live in `src/domain/`, adapters in `src/infrastructure/`.
- ❌ Use-case file / factory / type / DI key without `-use-case` / `UseCase` suffix. All four must carry it for grep + AI navigation. Reserve verb-only names for domain transitions / pure helpers.
- ❌ Adding `-use-case` suffix to a helper module (`crawl-loop.ts`, `crawl-shared.ts`, `configs.ts`) — helpers stay verb-only. The suffix marks the **bound, DI-wired orchestration unit**, not every file in `application/`.
- ❌ All error codes in `base.ts` — must be split into `errors/scopes/<scope>.ts` and aggregated into `ErrorCodes` in `base.ts`.
- ❌ Scope file containing a single code that never narrows a return signature — collapse into a neighbour scope (don't fragment for the sake of fragmenting).
- ❌ `throw` below HTTP boundary.
- ❌ `Promise<Result<...>>` or `AsyncResult<T>` without scope code.
- ❌ `err(error)` instead of `err([error])`.
- ❌ Error codes without `_ERROR` suffix.
- ❌ `unwrapOr(null)` / `_unsafeUnwrap` in production.
- ❌ `safeTry` / `yield*` on Results.
- ❌ `ResultAsync.fromPromise` / `ResultAsync.fromSafePromise` / `Result.fromThrowable` / `ResultAsync.fromThrowable` — use plain `try/catch`.
- ❌ `okAsync` / `errAsync` — return from `async` fn with `ok(...)` / `err([...])`.
- ❌ Chain methods on `Result` / `ResultAsync` (`.andThen` / `.orElse` / `.asyncMap` / `.asyncAndThen` / `.andTee` / `.orTee`) — `await` + `if (.isErr())`.

## References

- [errors.md](references/errors.md) — scope-per-file split, `result.ts`, `remapErrors`, `DomainError`, handler.
- [di.md](references/di.md) — `iti` layering, factory wiring, boundary access.
- [examples.md](references/examples.md) — end-to-end worked example (port + adapter + use-case + DI + route).
- [neverthrow-api.md](references/neverthrow-api.md) — primitives + house style.
- [integrations.md](references/integrations.md) — three folder patterns, integrations vs DI, plain functions vs services, factory-of-instance shape, schemas co-located.
- External: [iti](https://itijs.org/), [neverthrow](https://github.com/supermacro/neverthrow#api-documentation).
