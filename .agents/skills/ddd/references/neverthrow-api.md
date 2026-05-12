# neverthrow cheatsheet

Full docs: <https://github.com/supermacro/neverthrow#api-documentation>.

> **House style for this codebase: native `async` + `try/catch` + `return ok(...)` / `return err([...])`.**
> See [House style](#house-style-async--trycatch) below. **Do not use** `ResultAsync.fromPromise`, `ResultAsync.fromSafePromise`, `Result.fromThrowable`, `ResultAsync.fromThrowable`, or `safeTry` in new code — they're listed here only for reading existing snippets.

## Construction

| Primitive | Returns |
|---|---|
| `ok(value)` | `Result<T, never>` |
| `err(error)` | `Result<never, E>` |

In this codebase `err`'s channel is always an array: `err([{ code, message, ... }])`.

`okAsync` / `errAsync` exist in neverthrow but we don't use them — see house style.

## House style: `async` + `try/catch`

`AsyncResult<T, Code>` is `Promise<Result<T, Error<Code>[]>>` (see `errors.md`). Every fallible method is a plain `async` function returning `ok(...)` / `err([...])`. Wrap the I/O call in `try/catch` and translate the caught throwable into a typed error.

```typescript
// Service implementation
override async load(): AsyncResult<Snapshot | null, StateErrorCode> {
  try {
    const response = await s3.send(new GetObjectCommand({ Bucket, Key }));
    const raw = await response.Body!.transformToString();
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return err([{ code: "STATE_PARSE_ERROR", message: "Bad JSON", details: { issues: parsed.error.issues } }]);
    }
    return ok({ state: parsed.data, etag: response.ETag ?? null });
  } catch (cause) {
    if (isNotFound(cause)) return ok(null);
    logger.error("State load failed.", { cause });
    return err([{ code: "STATE_LOAD_ERROR", message: "Failed to load state.", details: { cause } }]);
  }
}
```

Use-cases compose by `await`ing each call and propagating errors with explicit early returns:

```typescript
async execute(input: Input): AsyncResult<Output, ScopeErrorCode> {
  const snapshotResult = await this.deps.stateStore.load();
  if (snapshotResult.isErr()) return err(snapshotResult.error);
  const snapshot = snapshotResult.value;

  const savedResult = await this.deps.stateStore.save({ state, expectedEtag: snapshot?.etag ?? null });
  if (savedResult.isErr()) return err(savedResult.error);

  return ok({ ... });
}
```

**Rules:**
- Every external `await` lives inside `try/catch` (or downstream call already returned a `Result`).
- Translate caught throwables into typed `Error<Code>` arrays.
- Early-return on `.isErr()` — no chaining, no `safeTry`, no `yield*`.
- Never `throw` below the HTTP boundary.
- Never return `Promise<Result<...>>` from a function not typed as `AsyncResult` — type alias keeps the contract.

## Transformation (still useful on `Result` values)

You'll still operate on synchronous `Result` values returned from awaited calls. These methods stay in play:

| Method | Effect |
|---|---|
| `.map(fn)` | Transform success. Err passes through. |
| `.mapErr(fn)` | Transform error. Ok passes through. |
| `.isOk()` / `.isErr()` | Type guards (preferred in our early-return style) |
| `.match(okFn, errFn)` | Inline branching at edges |

`.andThen` / `.orElse` / `.asyncMap` / `.asyncAndThen` / `.andTee` / `.orTee` exist in neverthrow but aren't used — express the same flow with `await` + `if`.

## Cross-scope error remap — `remapErrors`

Lives in `src/domain/errors/result.ts`. Use when an adapter / use-case wants to **collapse a downstream scope** into one of its own codes — the original `Error<FromCode>` is preserved as `details.cause`. Skip the helper when the caller needs to **discriminate** between downstream codes — propagate `result.error` directly and union the scope codes in the return type.

```typescript
export const remapErrors = <
  T,
  FromCode extends ErrorCode,
  ToCode extends ErrorCode,
>(
  result: Result<T, Error<FromCode>[]>,
  to: { code: ToCode; message: string; details?: Record<string, unknown> },
): Result<T, Error<ToCode>[]> => {
  if (result.isOk()) return ok(result.value);

  return err(result.error.map((cause) => ({
    code: to.code,
    message: to.message,
    details: { cause, ...to.details },
  })));
};
```

Canonical use:

```typescript
async clear(): AsyncResult<void, GenerationStateErrorCode> {
  const deleteResult = remapErrors(await this.storage.delete(this.key), {
    code: "GENERATION_STATE_CLEAR_ERROR",
    message: "Failed to clear generation state.",
    details: { key: this.key },
  });

  if (deleteResult.isErr()) return err(deleteResult.error);

  return ok(undefined);
}
```

Pass-through preserves the value, so it composes with the `await` + `.isErr()` early-return style — same shape whether the call returns `void` or a payload.

## Unwrapping (edges only)

| Method | Returns |
|---|---|
| `.isOk()` / `.isErr()` | `boolean` (type guards) — primary tool |
| `.match(okFn, errFn)` | Result of the matching branch — handy at the HTTP boundary |
| `.unwrapOr(default)` | Success value or default |
| `._unsafeUnwrap()` / `._unsafeUnwrapErr()` | **Tests only** — throws on the wrong branch |

## Combinators

```typescript
import { Result } from "neverthrow";

// Short-circuit on first error
Result.combine([fetchA(), fetchB(), fetchC()] as const);
// Result<[A, B, C], ErrA | ErrB | ErrC>

// Collect every error
Result.combineWithAllErrors([...]);
// Result<[A, B, C], (ErrA | ErrB | ErrC)[]>
```

Apply on already-resolved `Result`s (i.e. after `await`ing the individual `AsyncResult`s). Tuple must be `as const` to preserve types.

## Common pitfalls

- Forgetting `await` before `.isErr()` — `Promise.isErr` is `undefined`.
- Returning `Promise<Result<T, E>>` from a non-`AsyncResult`-typed function — keep the type alias for the contract.
- Mixing `try/catch` and stale `safeTry` patterns in the same file — pick one (house style: `try/catch`).
- Re-throwing inside `catch` instead of returning `err([...])` — defeats the Result discipline.
- Forgetting `as const` on `combine([...])` loses tuple types.

## Banned in new code

- `ResultAsync.fromPromise(promise, mapErr)`
- `ResultAsync.fromSafePromise(promise)`
- `Result.fromThrowable(fn, mapErr)`
- `ResultAsync.fromThrowable(fn, mapErr)`
- `safeTry(function* () { ... })` / `safeTry(async function* () { ... })`
- `yield*` on `Result` / `ResultAsync`
- `okAsync(...)` / `errAsync(...)`

If you encounter one of these in legacy code while editing, migrate the function to the house style.
