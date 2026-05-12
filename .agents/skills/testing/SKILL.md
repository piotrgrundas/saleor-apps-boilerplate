---
name: testing
description: Enforce Vitest test conventions — every `it(...)` body splits into `// given` / `// when` / `// then`; inputs + expected values in `given`, single action in `when`, assertions in `then`. Parametrized tests use `it.for(...)`. Tests run in parallel by default and must be parallel-safe; DB tests use the `tx` fixture with transaction rollback. `it` is imported from `@/lib/test/it.ts` (extended via `test.extend`), factories use faker with `overrides?: Partial<T>`. Use whenever the user asks to write, add, fix, review, or refactor any test in a `*.test.ts` / `*.spec.ts` file — even without words like "given/when/then" or "AAA". Triggers: "write a test", "add tests for X", "fix the failing test", "the test is flaky", "parametrize this test".
---

# Testing conventions

> **Read every `references/*.md` before writing tests.** If this `SKILL.md` and a reference disagree, **the reference wins** — this is a summary.

## Stack and guarantees

- **Runner: Vitest.** Config `vitest.config.ts`. Global setup `src/lib/test/setup.ts` runs `vi.resetAllMocks()` after every test — don't re-implement per file.
- **Parallel by default.** Every test must be safe under concurrency. Serial-only test = wrong test.
- **DB tests atomic via `tx` fixture** — transaction rollback is the isolation boundary.
- **No shared mutable state** across tests.

## Structure: `// given` / `// when` / `// then`

Every `it(...)` / `it.for(...)` body has these three lowercase markers, in order, each on its own line with a blank line above:

```typescript
it("should return isActive false when subscription is cancelled", async ({
  createSubscription,
}) => {
  // given
  const useCaseResult = createSubscription({ status: "CANCELED" });
  mockExecute.mockResolvedValue(useCaseResult);
  const executor = buildExecutor();

  // when
  const result = await executor({
    document: parse(SUBSCRIPTION_QUERY),
    variables: { id: useCaseResult.subscription.id },
  });

  // then
  expect(result).toMatchObject({
    data: { serviceSubscription: { isActive: false } },
  });
});
```

| Block   | Contents                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------- |
| `given` | Input vars, mocks, fixtures, SUT, **expected values** (named `expected*`). No asserts, no SUT calls. |
| `when`  | The single action. Usually one line. 3+ lines = test doing too much.                                 |
| `then`  | Every assertion. Nothing else.                                                                       |

After reading `given`, reviewer should predict `then`.

## `describe` hierarchy

Two levels: outer = file/feature/module, inner = function/method/query.

```typescript
describe("subscription queries", () => {
  describe("serviceSubscription", () => {
    it("should return subscription with enriched items when found", async () => {
      /* ... */
    });
    it("should return isActive false when subscription is cancelled", async () => {
      /* ... */
    });
  });
});
```

- Inner `describe` per function/method/query, even single-test. Keeps suite uniform.
- `it("should <observable behavior>")`. No `it("works")`. No leaking impl (`should call this._privateMethod`).
- Third-level `describe` only for shared non-trivial setup.

## File header

```typescript
import { describe, expect } from "vitest";
import { it } from "@/lib/test/it.ts"; // extended it — always
```

## Parametrized — quick rule

`it.for(...)` only (not `it.each`). Cases tuple `as const`, destructure context `{ expect, ...fixtures }`, per-case expecteds inside the cases array. Full template + interpolation rules: **[references/parametrized.md](references/parametrized.md)**.

## Fixtures and DB isolation — quick rules

`it` is extended once in `src/lib/test/it.ts` via `test.extend<...>(...)`. Two fixture shapes: stateful (lifecycle, e.g. `tx`) and pure-factory wrappers. DB-touching tests depend on `tx`; the transaction rolls back via `RollbackError` so parallel tests don't see each other. Never raw `db.insert(...)`. Factory signature is `(overrides?: Partial<T>) => T` with faker defaults — override, don't rebuild. Full fixture impl + DB rules + factory rules: **[references/fixtures.md](references/fixtures.md)**.

## Mocks

- Configure in `given` (`.mockResolvedValue(...)`).
- Assert call shape in `then`.
- Name after what they return (`mockExecute`, `mockGetOrderDetailsById`) — grep-friendly.
- For port-typed deps, use `MagicMock<PortType>()` from `@/lib/test/mock.ts`. Works against TS `type`s (ports are types, not classes). Returns a Proxy that auto-creates `vi.fn()` for any accessed property.

```typescript
import type { JobRepository } from "@/domain/ports/job-repository.ts";
import { MagicMock } from "@/lib/test/mock.ts";

const jobs = MagicMock<JobRepository>();
vi.mocked(jobs.load).mockResolvedValue(ok(null));
```

## Testing a use-case factory

Use-cases are factory functions (`(deps) => async (input) => result`). Tests build the bound function in `given`, invoke in `when`, assert in `then`.

```typescript
import { ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { startGenerationUseCase } from "@/application/start-generation-use-case.ts";
import type { JobRepository } from "@/domain/ports/job-repository.ts";
import type { JobScheduler } from "@/domain/ports/job-scheduler.ts";
import type { LoggingProvider } from "@/lib/logging/types.ts";
import { MagicMock } from "@/lib/test/mock.ts";

describe("startGenerationUseCase", () => {
  let jobs: JobRepository;
  let scheduler: JobScheduler;
  let logger: LoggingProvider;

  beforeEach(() => {
    jobs = MagicMock<JobRepository>();
    scheduler = MagicMock<JobScheduler>();
    logger = MagicMock<LoggingProvider>();
  });

  it("should trigger next when no active job exists", async () => {
    // given
    vi.mocked(jobs.load).mockResolvedValue(ok(null));
    vi.mocked(scheduler.triggerNext).mockResolvedValue(ok(undefined));
    const start = startGenerationUseCase({ jobs, scheduler, logger });

    // when
    const result = await start();

    // then
    expect(result.isOk()).toBe(true);
    expect(scheduler.triggerNext).toHaveBeenCalledOnce();
  });
});
```

- Build the bound function (`startGenerationUseCase({...})`) **in `given`**. It's setup, not the action.
- Call the bound function (`await start()`) in `when`.
- Do NOT call `.execute()` — use-cases are functions, not classes.

## Asserting `Result` (neverthrow)

```typescript
// then
expect(result.isOk()).toBe(true);
expect(result._unsafeUnwrap()).toEqual(expected);

// errors
expect(result.isErr()).toBe(true);
expect(result._unsafeUnwrapErr()[0].code).toBe("INVALID_ADDRESS_ERROR");
```

`_unsafeUnwrap` / `_unsafeUnwrapErr` exist only for tests.

## Don't test constants

Bare values exported from a module (string literals, numbers, plain enums, fixed arrays) carry no behavior — assertions on them just duplicate the source. The test breaks every time you intentionally change the value, never catches a bug, and adds noise.

```typescript
// ❌ no value
it("should expose stable prefix value", () => {
  expect(IN_PROGRESS_PREFIX).toBe("in-progress");
});

// ✅ test the function that consumes the constant
it("should compose key under in-progress prefix", () => {
  // given
  const expected = "in-progress/job-123/state.json";

  // when
  const result = inProgressKey({ jobId: "job-123", filename: "state.json" });

  // then
  expect(result).toBe(expected);
});
```

Test computed/derived constants only when the derivation has logic worth verifying (regex compiled from inputs, frozen object built via reducer).

## Anti-patterns

- ❌ Missing block markers, or `// arrange` / `// act` / `// assert`.
- ❌ Asserts in `given`. Computing expected in `then`.
- ❌ Multiple unrelated actions in `when`.
- ❌ Importing `it` from `"vitest"` directly.
- ❌ Per-file `vi.resetAllMocks()` — global setup handles it.
- ❌ Asserting private-method call order instead of observable behavior.
- ❌ Asserting bare constants — see "Don't test constants".
- ❌ `new XxxUseCase(...).execute(input)` in tests — use-cases are factory functions. Call `xxxUseCase(deps)(input)` instead.
- ❌ Mocking a port via `class StubXxx extends XxxService` — ports are TS `type`s, not classes. Use `MagicMock<Port>()`.
- See `references/parametrized.md` and `references/fixtures.md` for parametrized/DB/factory anti-patterns.

## References

- [parametrized.md](references/parametrized.md) — `it.for` template, case interpolation.
- [fixtures.md](references/fixtures.md) — `test.extend`, `tx` rollback, factories.
