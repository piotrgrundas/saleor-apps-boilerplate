# Function arguments

Functions, methods, factory closures with **two or more parameters** take a single object argument with destructured fields. Single-arg functions stay positional.

**Applies to every layer**: domain port methods, adapter factories, use-case factories + their returned handlers, DI factories, helper functions in `lib/`, middleware factories. Use-case input is always a single object even when it has one field (use-cases evolve; named input is forward-compatible).

## Narrow exceptions (positional allowed)

- **`Logger` port methods** (`logger.debug(msg, meta?)`) — mirror the well-known `console.*` shape across the JS ecosystem. Rewriting them as `{ message, meta }` fights ingrained muscle memory + breaks structured-logger compatibility. Treat Logger as a vendor-API shim.
- **Pure data-stream helpers** with a clear primary value + optional flags where positional reads more naturally than object (`path.join(a, b, c)`-style variadics — rare; document each case).

## Examples

```typescript
// ✅ two+ params as object
export const inProgressKey = ({ jobId, filename }: { jobId: string; filename: string }): string =>
  `${IN_PROGRESS_PREFIX}/${jobId}/${filename}`;

// ❌ positional with two+ args
export const inProgressKey = (jobId: string, filename: string): string =>
  `${IN_PROGRESS_PREFIX}/${jobId}/${filename}`;

// ✅ single param stays positional
export const outKey = (filename: string): string => `${OUT_PREFIX}/${filename}`;
```

## Why

- **Call sites self-document** — `inProgressKey({ jobId, filename })` reads better. No need to remember argument order.
- **Order-independent** — fields passed in any order, no misuse risk.
- **Forward-compatible** — adding an optional field doesn't break existing callers.
- **Refactor-friendly** — renaming a field = one edit in caller + definition; rearranging positional args touches every callsite.

## Class constructors

Constructors with **2+ params** also take a single destructured object. Lose the `private readonly` parameter-property shorthand — declare fields at the top, assign explicitly.

```typescript
// ✅ 2+ deps as object, fields declared, explicit assignment
export class CrawlCategoriesUseCase {
  private readonly stateService: GenerationStateService;
  private readonly storage: StorageService;

  constructor({
    stateService,
    storage,
  }: {
    stateService: GenerationStateService;
    storage: StorageService;
  }) {
    this.stateService = stateService;
    this.storage = storage;
  }
}

// ✅ single dep keeps `private readonly` shorthand
export class S3StorageService extends StorageService {
  constructor(private readonly bucket: string) {
    super();
  }
}

// ❌ 2+ positional params
export class CrawlCategoriesUseCase {
  constructor(
    private readonly stateService: GenerationStateService,
    private readonly storage: StorageService,
  ) {}
}
```

Why losing the shorthand is worth it: callers get named-arg semantics, refactors don't break parameter order across many `new X(...)` callsites, and DI wiring reads as `new Foo({ stateService, storage })` which mirrors the constructor signature.

## Anti-patterns

- ❌ Two or more positional params on a free function, method, port signature, or factory (excluding constructors with `private readonly` single-dep shorthand, or documented well-known-API mirrors like `Logger`).
- ❌ Object input with a single field on a _non-use-case_ function (`fn({ jobId })` for one-arg helper) — pointless ceremony, prefer `fn(jobId)`. Use-cases keep object input for forward-compat.
- ❌ Mixing one positional + one object (`fn(jobId, { filename })`) — pick a side, all-positional or all-object.
- ❌ Port signature with 2+ positional params even when "intuitive" — `storage.put(key, body)` should be `storage.put({ key, body })`.
