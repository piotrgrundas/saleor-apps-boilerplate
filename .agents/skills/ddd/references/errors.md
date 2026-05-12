# Error modeling playbook

Errors live at `src/domain/errors/`:

```
src/domain/errors/
├── base.ts                # aggregates all scopes into ErrorCodes union + Error<T> shape
├── result.ts              # AsyncResult + neverthrow re-exports + remapErrors
├── format.ts              # ErrorCodeFormat literal type
└── scopes/                # one file per scope
    ├── catalogue.ts
    ├── crawl.ts
    ├── finalize-generation.ts
    ├── generation-control.ts
    ├── generation-state.ts
    ├── init-generation.ts
    ├── self-invoker.ts
    ├── sitemap-builder.ts
    └── storage.ts
```

Routes convert typed failures into `DomainError` subclasses from `src/lib/error/handler.ts`. A single `errorHandler` renders the response.

## Scope-per-file split

**One scope = one file under `scopes/`.** Each scope file owns its constant tuple and the derived type. `base.ts` imports every scope's tuple and spreads them into the top-level `ErrorCodes` union.

```typescript
// src/domain/errors/scopes/crawl.ts
import type { ErrorCodeFormat } from "../format.ts";

export const CRAWL_ERROR_CODES = [
  "CRAWL_STATIC_BUILD_ERROR",
  "CRAWL_STATIC_WRITE_ERROR",
  "CRAWL_STATIC_SAVE_ERROR",
  "CRAWL_COLLECTIONS_FETCH_ERROR",
  "CRAWL_COLLECTIONS_BUILD_ERROR",
  "CRAWL_COLLECTIONS_WRITE_ERROR",
  "CRAWL_COLLECTIONS_SAVE_ERROR",
  // ...
] as const satisfies readonly ErrorCodeFormat[];

export type CrawlErrorCode = typeof CRAWL_ERROR_CODES[number];
```

```typescript
// src/domain/errors/base.ts
import { CATALOGUE_ERROR_CODES } from "./scopes/catalogue.ts";
import { CRAWL_ERROR_CODES } from "./scopes/crawl.ts";
import { FINALIZE_GENERATION_ERROR_CODES } from "./scopes/finalize-generation.ts";
import { GENERATION_CONTROL_ERROR_CODES } from "./scopes/generation-control.ts";
import { GENERATION_STATE_ERROR_CODES } from "./scopes/generation-state.ts";
import { INIT_GENERATION_ERROR_CODES } from "./scopes/init-generation.ts";
import { SELF_INVOKER_ERROR_CODES } from "./scopes/self-invoker.ts";
import { SITEMAP_BUILDER_ERROR_CODES } from "./scopes/sitemap-builder.ts";
import { STORAGE_ERROR_CODES } from "./scopes/storage.ts";

export const ErrorCodes = [
  ...GENERATION_STATE_ERROR_CODES,
  ...STORAGE_ERROR_CODES,
  ...SITEMAP_BUILDER_ERROR_CODES,
  ...SELF_INVOKER_ERROR_CODES,
  ...CATALOGUE_ERROR_CODES,
  ...INIT_GENERATION_ERROR_CODES,
  ...CRAWL_ERROR_CODES,
  ...FINALIZE_GENERATION_ERROR_CODES,
  ...GENERATION_CONTROL_ERROR_CODES,
] as const;
export type ErrorCode = typeof ErrorCodes[number];

export type Error<T extends ErrorCode = ErrorCode> = {
  code: T;
  message: string;
  field?: string;
  details?: unknown;
};
```

## Adding a code

1. Append to the matching scope tuple in `scopes/<scope>.ts`. TS narrows the type automatically.
2. TypeScript flags any boundary `switch` that's missing the new case — handle each one.

## Adding a scope

When existing scopes don't fit (typically: a new use-case with distinct failure modes, or a new port).

1. Create `scopes/<new-scope>.ts`:

    ```typescript
    import type { ErrorCodeFormat } from "../format.ts";

    export const CDN_ERROR_CODES = [
      "CDN_PURGE_ERROR",
    ] as const satisfies readonly ErrorCodeFormat[];

    export type CdnErrorCode = typeof CDN_ERROR_CODES[number];
    ```

2. In `base.ts`, import the new tuple and spread it into `ErrorCodes`:

    ```typescript
    import { CDN_ERROR_CODES } from "./scopes/cdn.ts";

    export const ErrorCodes = [
      ...CDN_ERROR_CODES,
      // ...
    ] as const;
    ```

3. Boundary `switch` statements will need a new branch — TS forces the issue.

### When to create a new scope

Create a scope when:

- A **port** is being added — its method signatures need a narrow error type (`Storage` → `StorageErrorCode`). The port's consumers union it with their own scope.
- A **use-case** has multiple failure modes that need to be narrowed for the boundary handler (e.g. `INIT_GENERATION_SAVE_ERROR` distinct from a generic `GENERATION_STATE_SAVE_ERROR` because INIT has its own ifAbsent semantics).
- An existing scope's tuple is becoming a grab-bag of unrelated codes — split when the divisions stop being arbitrary.

Do NOT create a scope when:

- It would hold a single code that no signature narrows on. Collapse into a neighbour.
- The codes already fit naturally into an existing scope.
- The motivation is "this looks like a new place to put codes" rather than "a consumer needs this narrower type."

## Error shape

```typescript
type ErrorCodeFormat = `${string}_ERROR`;

export type Error<T extends ErrorCode = ErrorCode> = {
  code: T;
  message: string;
  field?: string;
  details?: unknown;
};
```

Every code must end with `_ERROR` (enforced by `ErrorCodeFormat`).

## Producing errors

Return `err([...])` with `Error<Code>` entries. **Always an array.**

```typescript
return err([{
  code: "CRAWL_PRODUCTS_FETCH_ERROR",
  message: "Failed to fetch products page.",
  details: { cause, channel: channel.slug, cursor },
}]);
```

- `message` is developer-facing. Short, declarative.
- `field` names an input field for validation errors; omit otherwise.
- `details` is free-form — original `cause`, IDs, partial payloads. **Never drop the cause** when wrapping an external throwable.

## Scope types, not literals

Function signatures use the **scope type**, never a literal:

```typescript
// Bad
async upload(blob: Uint8Array): AsyncResult<string>;                          // untyped
async upload(blob: Uint8Array): AsyncResult<string, "SITEMAP_UPLOAD_ERROR">;  // literal drifts

// Good
async upload(blob: Uint8Array): AsyncResult<string, StorageErrorCode>;
```

Higher layers (use-cases) union scope types they touch:

```typescript
export type StartGenerationErrorCode =
  | GenerationControlErrorCode
  | GenerationStateErrorCode
  | SelfInvokerErrorCode;

export const startGeneration =
  (deps: Deps) =>
  async (): AsyncResult<void, StartGenerationErrorCode> => { /* ... */ };
```

## Consuming errors

### Inside domain / application / infrastructure — stay wrapped

Propagate by `await`ing the dependency call and early-returning on `.isErr()`:

```typescript
const result = await dependency.call();
if (result.isErr()) return err(result.error);
const value = result.value;
```

### Re-mapping across scope boundaries — `remapErrors`

When a use-case (scope: `CrawlErrorCode`) calls a port (scope: `StorageErrorCode`), the storage error is foreign to the use-case's return signature. Re-map it:

```typescript
import { remapErrors } from "@/domain/errors/result.ts";

const listResult = remapErrors(
  await ctx.storage.list(chunkPrefix({ jobId, phase, channel: channel.slug })),
  {
    code: ctx.errorCodes.write,                   // re-map into caller's scope
    message: `Failed to list existing ${phase.toLowerCase()} chunks.`,
    details: { jobId, channel: channel.slug },
  },
);

if (listResult.isErr()) return err(listResult.error);
```

`remapErrors` preserves the original errors as `details.cause` so debugging context is not lost. Rarely pattern-match internally — pattern-matching belongs at the HTTP boundary.

See `references/neverthrow-api.md` for the full house style and the list of banned APIs (`safeTry`, `fromPromise`, `fromThrowable`, `okAsync`/`errAsync`, chain methods).

### At the boundary — throw `DomainError`

`DomainError` (and subclasses) carry the typed `Error<Code>[]` as `cause`. The global `errorHandler` renders them. Routes pick the subclass that matches HTTP semantics.

```typescript
import {
  DomainError,
  DomainNotFoundError,
  DomainValidationError,
} from "@/lib/error/handler.ts";

return result.match(
  (data) => c.json(data),
  (errors) => {
    const [first] = errors;
    switch (first.code) {
      case "GENERATION_CONTROL_ACTIVE_JOB_ERROR": throw new DomainError(409, errors);
      case "GENERATION_STATE_PARSE_ERROR":         throw new DomainError(500, errors);
      case "SELF_INVOKER_INVOKE_ERROR":            throw new DomainError(502, errors);
      // ...
      default: {
        const _exhaustive: never = first.code;
        throw new DomainError(500, errors);
      }
    }
  },
);
```

| Subclass | Status | Use for |
|---|---|---|
| `DomainValidationError` | 400 | Input / business-rule validation |
| `DomainUnauthorizedError` | 401 | Caller not authenticated / forbidden |
| `DomainNotFoundError` | 404 | Resource missing |
| `DomainError(status, errors)` | any | Everything else (409 conflict, 502 upstream, …) |

Pass the whole `errors` array — the class serializes every entry into the response `errors[]`.

## `result.ts` helpers

```typescript
import { err, ok, Result, ResultAsync } from "neverthrow";
import type { Error, ErrorCode } from "./base.ts";

export type OkType<T>  = T extends Result<infer O, unknown> ? O : never;
export type ErrType<T> = T extends Result<unknown, infer E> ? E : never;

export type AsyncResult<T, Code extends ErrorCode = ErrorCode> =
  Promise<Result<T, Error<Code>[]>>;

export type OkResult<T>  = T extends (...args: never) => Promise<Result<infer Ok, unknown>> ? Ok : never;
export type ErrResult<T> = T extends (...args: never) => Promise<Result<unknown, infer Err>> ? Err : never;

export const remapErrors = <T, From extends ErrorCode, To extends ErrorCode>(
  result: Result<T, Error<From>[]>,
  shape: { code: To; message: string; details?: unknown },
): Result<T, Error<To>[]> => {
  if (result.isErr()) {
    return err([{ ...shape, details: { ...shape.details, cause: result.error } }]);
  }
  return ok(result.value);
};

export { Result, ResultAsync };
```

| Helper | Purpose |
|---|---|
| `AsyncResult<T, Code>` | Canonical async return type — `Promise<Result<T, Error<Code>[]>>` |
| `OkType<T>` / `ErrType<T>` | Extract sides of a `Result<O, E>` |
| `OkResult<T>` / `ErrResult<T>` | Extract sides of a function returning `Promise<Result>` — useful in test types |
| `remapErrors` | Wrap a callee's error in the caller's scope, preserving cause |

## Anti-patterns

- ❌ All codes piled into `base.ts` — must split into `scopes/<scope>.ts` and aggregate in `base.ts`.
- ❌ Scope file holding a single code no signature narrows on — collapse into a neighbouring scope.
- ❌ Creating bespoke error classes outside the registry (`class SitemapError extends Error`).
- ❌ `err(error)` not `err([error])`.
- ❌ `AsyncResult<T>` without a narrow scope code.
- ❌ Codes without `_ERROR` suffix — TS will reject, don't route around it.
- ❌ Dropping the `cause` in `details` when wrapping an external throwable.
- ❌ Manually constructing JSON responses in routes instead of throwing `DomainError`.
- ❌ Pattern-matching on error codes inside domain / use-cases — re-map with `remapErrors` instead. Pattern-matching belongs at the HTTP boundary only.
