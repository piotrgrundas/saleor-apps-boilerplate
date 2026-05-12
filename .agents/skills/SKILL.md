---
name: code-style-guidelines
description: General code style rules for this project that aren't enforced by the toolchain (Deno fmt + lint, no eslint). Today covers import grouping; expand as new conventions are agreed. Use whenever you write or modify any `.ts` / `.tsx` file — even without words like "style" / "format". Triggers: "add an import", "fix import order", "clean up this file", "the imports look messy", any new module creation, or any code review of style concerns the formatter doesn't catch.
---

# Code style guidelines

Conventions enforced by reviewers, not by tooling. Project uses `deno fmt` + `deno lint`; anything below is on top of those.

> **Universal TypeScript style** (`prefer type over interface`, `import type` for type-only imports) lives in the user-level `typescript-style` skill at `~/.claude/skills/typescript-style/SKILL.md`. Apply both — this project skill is additive.

## Imports — grouping

When the toolchain has no import sorter (no `eslint-plugin-simple-import-sort`, no `sort-imports`, no `deno fmt` `sortImports`), keep imports tidy by hand: three groups, single blank line between each.

### Group order

1. **External libs** — bare specifiers from npm / jsr / built-ins (`zod`, `hono`, `neverthrow`, `node:fs`, `react`).
2. **Internal aliases** — paths under the project alias (`@/...`).
3. **Relative imports** — `./foo.ts`, `../bar.ts`.

A type-only import (`import type ...`) belongs to the same group as its module specifier — don't split type vs value.

### Layout

Single blank line between groups. No blank lines inside a group. A group can be empty (skip it entirely).

```typescript
import { Result, ResultAsync } from "neverthrow";
import { z } from "zod";

import type { StorageErrorCode } from "@/domain/errors/scopes/storage.ts";
import type { AsyncResult } from "@/domain/errors/result.ts";
import { prepareConfig } from "@/lib/config/util.ts";

import { APP_CONFIG } from "./config.ts";
import { container } from "./container.ts";
```

### Within a group

Sort alphabetically by module specifier (case-insensitive). Stable, grep-friendly. If the toolchain ever adds an auto-sort rule, behavior matches.

### Side-effect imports

Bare `import "./foo.ts";` (no specifiers) — place inside the group that matches its specifier kind, top of that group:

```typescript
import "node:async_hooks";

import "@/lib/polyfill.ts";

import "./register.ts";
```

### Sentry / instrumentation exception

Some libs (Sentry, OpenTelemetry) require `init(...)` to run **before** any instrumented module is imported. Keep that call between blocks — readability beats grouping here:

```typescript
import { init, wrapHandler } from "@/lib/error/reporting/sentry/instrument.ts";
import { APP_CONFIG } from "./config.ts";

init(APP_CONFIG);

import { Hono } from "hono";

import { errorHandler } from "@/lib/error/handler.ts";
```

When you see this pattern, do not "fix" the order. Treat the `init(...)` line as a barrier; groups apply within each segment.

### Imports anti-patterns

- ❌ External, alias, relative all mashed together with no blank lines.
- ❌ Two blank lines between groups (single blank only).
- ❌ Splitting `import type` away from `import` of the same module spec class.
- ❌ Reordering the segments of a Sentry/OTel pattern, breaking instrumentation.
- ❌ Sorting across group boundaries — sort _within_ each group only.

## Function arguments — object destructuring beyond one

Functions, methods, factory closures with **two or more parameters** take a single object argument with destructured fields. Single-arg functions stay positional.

```typescript
// good — two+ params as object
export const inProgressKey = ({ jobId, filename }: { jobId: string; filename: string }): string =>
  `${IN_PROGRESS_PREFIX}/${jobId}/${filename}`;

// bad — positional params with two+ args
export const inProgressKey = (jobId: string, filename: string): string =>
  `${IN_PROGRESS_PREFIX}/${jobId}/${filename}`;

// good — single param stays positional
export const outKey = (filename: string): string => `${OUT_PREFIX}/${filename}`;
```

### Why

- **Call sites are self-documenting** — `inProgressKey({ jobId, filename })` reads better than `inProgressKey(jobId, filename)`. No need to remember argument order.
- **Order-independent** — fields can be passed in any order without misuse risk.
- **Forward-compatible** — adding an optional field doesn't break existing callers.
- **Refactor-friendly** — renaming a field is one edit in caller and definition; rearranging positional args has to touch every callsite.

### Class constructors follow the same rule

Constructors with **2+ params** also take a single destructured object. Lose the `private readonly` parameter-property shorthand — declare fields at the top of the class, assign explicitly in the body.

```typescript
// good — 2+ deps as object, fields declared, explicit assignment
export class CrawlCategoriesUseCase {
  private readonly stateService: GenerationStateService;
  private readonly storage: StorageService;
  // ...

  constructor({
    stateService,
    storage /* ... */,
  }: {
    stateService: GenerationStateService;
    storage: StorageService;
    // ...
  }) {
    this.stateService = stateService;
    this.storage = storage;
    // ...
  }
}

// good — single dep keeps positional `private readonly` shorthand
export class S3StorageService extends StorageService {
  constructor(private readonly bucket: string) {
    super();
  }
}

// bad — 2+ positional params
export class CrawlCategoriesUseCase {
  constructor(
    private readonly stateService: GenerationStateService,
    private readonly storage: StorageService,
    // ...
  ) {}
}
```

Why losing the shorthand is worth it: callers benefit from named-arg semantics, refactors don't break parameter order across many `new X(...)` callsites, and DI wiring reads as `new Foo({ stateService, storage })` which mirrors the constructor signature.

### Function args anti-patterns

- ❌ Two or more positional params on a free function or method (excluding constructors with `private readonly`).
- ❌ Object input with a single field (`fn({ jobId })` for one-arg) — pointless ceremony, prefer `fn(jobId)`.
- ❌ Mixing one positional + one object (`fn(jobId, { filename })`) — pick a side, all-positional or all-object.

## Naming — literal, not jargon

In identifiers, test descriptions, comments, and log messages: use the literal mechanism (predicate, method name, abstract term), not coined metaphors or vendor-specific terms in storage/runtime-agnostic layers.

| ❌ jargon              | ✅ literal                                               |
| ---------------------- | -------------------------------------------------------- |
| `"on budget cut"`      | `"when shouldContinue returns false"`                    |
| `"ifAbsent race lost"` | `"when stateService.save returns written: false"`        |
| `clearOutBucket` (AWS) | `clearOutPrefix` (matches `StorageService.deletePrefix`) |
| `// race lost`         | `// save returned written: false — concurrent INIT won`  |

Triggers to rewrite: `race`, `budget`, `magic`, `under the hood`, `bucket`/`S3 path`/`Lambda invocation` outside infra.
