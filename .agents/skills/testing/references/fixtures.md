# Fixtures and DB isolation

## Extending `it`

Project fixtures live in `src/lib/test/`. Extend Vitest `test` once, export as `it`:

```typescript
// src/lib/test/it.ts
import { test } from "vitest";
import { db } from "@/db/client.ts";
import { expectError } from "@/lib/error/helpers.ts";
import { RollbackError } from "./rollback-error.ts";
import { createDbSubscription, createSubscription /* ... */ } from "./factories/index.ts";

export const it = test.extend<Fixtures & DbFixtures>({
  tx: async ({}, use) => {
    try {
      await db.transaction(async (tx) => {
        await use(tx as unknown as TestDb);
        throw new RollbackError();
      });
    } catch (err) {
      expectError(err, RollbackError);
    }
  },
  createDbSubscription: async ({ tx }, use) => {
    await use(createDbSubscription(tx));
  },
  createSubscription: async ({}, use) => {
    await use(createSubscription);
  },
});
```

Two shapes:

- **Stateful** — has lifecycle (transactions, servers). `tx` opens a transaction, throws `RollbackError` to roll back. Dependents destructure: `async ({ tx }, use) => ...`.
- **Pure factory** — wrap as `async ({}, use) => { await use(fn); }` so every fixture enters via the same channel.

Always import `it` from `@/lib/test/it.ts`. Never from `"vitest"` directly.

## DB isolation via transaction rollback

`tx` is canonical for any DB-touching test. The transaction never commits → parallel tests can't see each other, no cleanup needed.

- DB-touching fixtures depend on `tx` — inserts roll back with it.
- Tests read/write through `tx`, never raw `db`. Direct `db.insert(...)` leaks.
- Never commit. No `BEGIN` / `COMMIT`.
- Never serialize to dodge concurrency bugs — fix the shared state.

## Factories — faker + overrides

Signature: `(overrides?: Partial<T>) => T`.

```typescript
import { faker } from "@faker-js/faker";

export const createAddress = (overrides?: Partial<Address>): Address => ({
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  streetAddress1: faker.location.streetAddress(),
  postalCode: faker.location.zipCode(),
  city: faker.location.city(),
  phone: faker.phone.number(),
  countryCode: faker.location.countryCode(),
  // ...
  ...overrides,
});
```

- Always a function — fresh data per call surfaces order-dependence bugs.
- Return real type, not `Partial<T>`.
- Faker for noise; hardcode only via `overrides`.
- DB-row factories parameterized by `tx`: `(tx) => (overrides) => { ... }`.

Override, don't rebuild:

```typescript
// bad
const subscription = { id: "s-1", userId: "u-1", status: "CANCELED" /* ...20 more */ };
// good
const { subscription } = createSubscription({ status: "CANCELED" });
```

Anti-patterns:

- ❌ Hardcoded factory defaults (`firstName: "John"`).
- ❌ Factories returning `Partial<T>` / loose types.
- ❌ DB tests that commit or rely on cleanup hooks.
- ❌ Serial-only tests (`describe.sequential`, `test.concurrent(false)`) — fix isolation.
