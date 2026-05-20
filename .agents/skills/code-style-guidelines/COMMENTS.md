# Comments — `//` for single-line, `/** */` for multi-line

Pick by length, not by context:

- **Single line** → `// comment`
- **Multi line (2+ lines)** → `/** ... */` block

No mixing within one comment. Do not stack `//` lines for multi-line content. Do not collapse a multi-line `/** */` to a single `/** one-liner */` form.

## Single-line `//`

```typescript
// ✅
// https://support.google.com/merchants/answer/6324448 (availability)
export const FEED_AVAILABILITY = ["in_stock", "out_of_stock"] as const;

export const feedProductSchema = z.object({
  // https://support.google.com/merchants/answer/6324405 (id)
  id: z.string(),
});
```

```typescript
// ❌ single-line `/** ... */` — use `//`
/** https://support.google.com/merchants/answer/6324448 (availability) */
export const FEED_AVAILABILITY = ["in_stock", "out_of_stock"] as const;
```

## Multi-line `/** */`

```typescript
// ✅
/**
 * Normalized product shape for Google Merchant feed output.
 * Spec: https://support.google.com/merchants/answer/7052112
 * RSS 2.0 + g: namespace: https://support.google.com/merchants/answer/160589
 */
export const feedProductSchema = ...;

export type StoragePutInput = {
  key: string;
  body: Uint8Array | string;
  contentType?: string;
  /**
   * Writes only if no object exists at `key` (atomic on file FS via O_EXCL,
   * on S3 via `If-None-Match: *`). `written: false` = skipped because object
   * already existed.
   */
  ifAbsent?: boolean;
};
```

```typescript
// ❌ stacked `//` for multi-line content — use `/** */`
// Normalized product shape for Google Merchant feed output.
// Spec: https://support.google.com/merchants/answer/7052112
// RSS 2.0 + g: namespace: https://support.google.com/merchants/answer/160589
export const feedProductSchema = ...;
```

## At-a-glance table

| Length   | Form               | Example                                      |
| -------- | ------------------ | -------------------------------------------- |
| 1 line   | `// text`          | `// https://support.google.com/...`          |
| 2+ lines | `/** ... */` block | `/**`<br>` * line 1`<br>` * line 2`<br>` */` |

## Why

- **Length picks form** — single rule, easy to apply: count lines, pick form. No per-context exceptions.
- **`/** \*/` for multi-line groups\*\* — single comment unit, single open/close, editors fold/unfold cleanly.
- **`//` for one-liners** — diff stays tight, no `*/` trailing edits, no width inflation.
- **No JSDoc tags consumed** — even inside `/** */`, do not use `@param` / `@returns` / `@example`; the TS signature is the source of truth. The block is for prose only.

## Anti-patterns

- ❌ Single-line `/** text */` — rewrite to `// text`.
- ❌ Stacked `//` lines forming a multi-line block — rewrite to a single `/** ... */` block.
- ❌ `@param` / `@returns` / `@example` tags inside `/** */` — drop them; types already document signature.
- ❌ Block comment using `/* ... */` instead of `/** ... */` — always use `/**` for the opening.
