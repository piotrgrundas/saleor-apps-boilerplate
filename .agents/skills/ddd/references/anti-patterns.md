# Anti-patterns

Exhaustive list. SKILL.md surfaces the top items; this file is the full reference. Group by area.

## Context + Providers

- ❌ `logger` in `Deps` of a use-case / procedure / adapter factory — logger lives in `Context`, threaded per call. Deps is construction-time only.
- ❌ Port method taking `ctx: Context` param — use Provider pattern (`<Port>Provider = (ctx) => Port`); methods stay ctx-free. ctx is captured in the Provider closure.
- ❌ Adapter inner factory missing the ctx-bound closure — `createX(opts)` must return `(ctx) => Port`, not `Port` directly. The two-phase split keeps heavy state warm (boot) and ctx fresh (per request).
- ❌ Reading ambient request state (`AsyncLocalStorage`, globals, `process.env` mid-call) inside an adapter — adapter depends on `domain/context.ts` only. No reach into runtime/middleware.
- ❌ Plain function dep that may log/fail but skips `ctx` — `FetchSaleorAppId` and similar take `(input, ctx)` even if internals don't log yet.
- ❌ Calling `useCase(undefined, ctx)` — use-case takes single object `{ ctx, ...input }`. Void input → `useCase({ ctx })`.

## Ports

- ❌ `abstract class` for a port — use `type`.
- ❌ Port-implementing class in `infrastructure/` (`class S3Storage implements Storage`) — use factory function (`createS3Storage(...): StorageProvider`).
- ❌ Port with one method (`type StoreService = { getAppId(...) }`) — collapse to plain function + function-typed alias. Service wrapping single op = function in tuxedo.
- ❌ Port leaking adapter details (cursors typed as Saleor strings, error details containing AWS metadata) — re-shape until vendor-neutral.
- ❌ Boolean variant flag (`verifyJWS({ ..., detached: boolean })`) — split into two methods (`verifyJWS` + `verifyJWSDetached`). Boolean = code smell.
- ❌ Variant prefix (`verifyDetachedJWS`) — use suffix (`verifyJWSDetached`) so variants group with base name in autocomplete/sort.

## Adapters

- ❌ Flat adapter file `infrastructure/<port>/<vendor>-<port>.ts` without vendor subfolder — must be `infrastructure/<port>/<vendor>/<vendor>-<port>.ts`. Vendor folder isolates vendor-specific helpers (SDKs, generated code, schemas).
- ❌ Vendor-specific helpers at the port folder root (`infrastructure/storage/s3-helpers.ts`) — move into the vendor folder. Only port-level shared utilities (types, redaction) live at the root.
- ❌ Heavy SDK init inside per-request inner closure — `new S3Client()` belongs in the outer factory body so it's cached at DI boot. Inner closure only allocates the bound port object.
- ❌ Registering `integrations/<vendor>/` code in DI — vendor procedures composed at call site. Global container = generic primitives only.
- ❌ Per-vendor DI keys (`saleorInstall`, `shopifyInstall`) bloating global container — pull vendor composition out, expose only the cross-vendor primitives the integration consumes.

## Use-cases + procedures

- ❌ Use-case as class with `.execute()` — must be factory function returning a curried handler.
- ❌ Use-case file for N=1 trivial delegation (single-step wrap of one port call) — collapse into consumer or use a plain procedure file under `integrations/<vendor>/`.
- ❌ Use-case file / factory / type / DI key without `-use-case` / `UseCase` suffix. All four must carry it for grep + AI navigation. Reserve verb-only names for domain transitions / pure helpers.
- ❌ Adding `-use-case` suffix to a helper module (`crawl-loop.ts`, `crawl-shared.ts`, `configs.ts`) — helpers stay verb-only. The suffix marks the **bound, DI-wired orchestration unit**, not every file in `application/`.
- ❌ Use-case factory calling another use-case factory inside — extract shared logic to a helper module both call.
- ❌ Inheritance in `application/` (`class ChannelScopedCrawl extends CatalogueCrawl`) — compose via shared helper modules.

## Domain

- ❌ Domain importing `application/`, `infrastructure/`, `di/`, or vendor SDKs.
- ❌ "AppConfig" type in `domain/` with vendor-flavored fields (`saleorDomain`, `saleorApiUrl`) — move schema to `infrastructure/integrations/<vendor>/app-config/schema.ts`. Domain stays vendor-neutral.
- ❌ Schema for vendor protocol body in `domain/` — co-locate with the integration concern (`integrations/saleor/install/schema.ts`, `integrations/saleor/webhook/schema.ts`).
- ❌ Adding _methods_ to a domain entity — define **named transition functions** at the entity's module level.
- ❌ Inline state-mutation in use-case (`{ ...job, invocationCount: job.invocationCount + 1 }`) when a transition like `recordBatch` exists — call the transition.
- ❌ Hand-writing TS `interface`/`type` for a domain object — schema first via `z.infer`.
- ❌ Path under `src/application/domain/` or `src/application/infrastructure/` — those locations are dead; entities live in `src/domain/`, adapters in `src/infrastructure/`.

## Errors

- ❌ All error codes in `base.ts` — must be split into `errors/scopes/<scope>.ts` and aggregated into `ErrorCodes` in `base.ts`.
- ❌ Scope file containing a single code that never narrows a return signature — collapse into a neighbour scope (don't fragment for the sake of fragmenting).
- ❌ Generic error code prefix that hides emitter (`STORE_REQUEST_ERROR` when only Saleor emits it) — prefix with emitter name (`SALEOR_REQUEST_ERROR`). Scope file mirrors emitter (`scopes/saleor.ts`).
- ❌ `throw` below HTTP boundary.
- ❌ `Promise<Result<...>>` or `AsyncResult<T>` without scope code.
- ❌ `err(error)` instead of `err([error])`.
- ❌ Error codes without `_ERROR` suffix.
- ❌ Helper for single-element `err([...])` — keeps array shape visible, avoid hiding the contract.

## Result pattern (neverthrow)

- ❌ `unwrapOr(null)` / `_unsafeUnwrap` in production.
- ❌ `safeTry` / `yield*` on Results.
- ❌ `ResultAsync.fromPromise` / `ResultAsync.fromSafePromise` / `Result.fromThrowable` / `ResultAsync.fromThrowable` — use plain `try/catch`.
- ❌ `okAsync` / `errAsync` — return from `async` fn with `ok(...)` / `err([...])`.
- ❌ Chain methods on `Result` / `ResultAsync` (`.andThen` / `.orElse` / `.asyncMap` / `.asyncAndThen` / `.andTee` / `.orTee`) — `await` + `if (.isErr())`.

## DI + boundary

- ❌ Concrete adapter import outside `src/di/**`, `src/apps/*/di/**` — application/use-cases depend on the port _type_ only.
- ❌ Boundary code (entry-server / route) calling adapters or ports directly — touch `container.items.<useCase>(...)` only.

## File layout / naming

- ❌ `config/index.ts` folder with only one file — flatten to `config.ts`. Folder earns its keep with multiple files.
- ❌ Mixing env config (`config.ts`) and tenant app-config schema (`app-config.ts`) in same file — env vars vs persisted tenant data are different concepts.
- ❌ `__var` / `_var` prefix inside factory functions — closures already enforce privacy. Pure noise.
