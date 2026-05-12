# Parametrized tests — `it.for`

`it.for` passes test context as second arg — keeps fixtures uniform. Use it instead of `it.each`.

```typescript
it.for(
  [
    { phase: "STATIC", expected: "PAGES" },
    { phase: "PAGES", expected: "COLLECTIONS" },
    { phase: "COLLECTIONS", expected: "PRODUCTS" },
    { phase: "PRODUCTS", expected: "FINALIZE" },
  ] as const,
)(
  "should advance $phase to $expected",
  ({ phase, expected }, { expect }) => {
    // given
    const job = buildGenerationJob({ phase });

    // when
    const result = advancePhase(job);

    // then
    expect(result).not.toBeNull();
    expect(result!.phase).toBe(expected);
  },
);
```

Rules:

- Cases tuple `as const` so `$field` / `$value` interpolate typed.
- Destructure context: `{ expect, ...fixtures }`. Prefer context `expect` over imported.
- Per-case expected values go inside the cases array (`{ input: "USD", expected: 2 }`), read from `given`, asserted in `then`.

Anti-patterns:

- ❌ `it.each` with fixtures — use `it.for`.
- ❌ Cases array not `as const`.
