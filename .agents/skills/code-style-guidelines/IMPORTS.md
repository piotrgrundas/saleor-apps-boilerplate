# Imports

Three groups, single blank line between each. No `.ts` / `.tsx` extensions on the specifier — bundler resolver handles them.

## Group order

1. **External libs** — bare specifiers from npm / jsr / built-ins (`zod`, `hono`, `neverthrow`, `node:fs`, `react`).
2. **Internal aliases** — paths under the project alias (`@/...`).
3. **Relative imports** — `./foo`, `../bar`.

A type-only import (`import type ...`) belongs to the same group as its module specifier — don't split type vs value.

## Layout

Single blank line between groups. No blank lines inside a group. A group can be empty (skip it entirely).

```typescript
import { Result, ResultAsync } from "neverthrow";
import { z } from "zod";

import type { AsyncResult } from "@/domain/errors/result";
import type { StorageErrorCode } from "@/domain/errors/scopes/storage";
import { prepareConfig } from "@/lib/config/util";

import { APP_CONFIG } from "./config";
import { container } from "./container";
```

## Within a group

Sort alphabetically by module specifier (case-insensitive). Stable, grep-friendly.

## Side-effect imports

Bare `import "./foo";` (no specifiers) — place inside the group that matches its specifier kind, top of that group:

```typescript
import "node:async_hooks";

import "@/lib/polyfill";

import "./register";
```

## Sentry / instrumentation exception

Some libs (Sentry, OpenTelemetry) require `init(...)` to run **before** any instrumented module is imported. Keep that call between blocks — readability beats grouping here:

```typescript
import { init, wrapHandler } from "@/lib/error/reporting/sentry/instrument";
import { APP_CONFIG } from "./config";

init(APP_CONFIG);

import { Hono } from "hono";

import { errorHandler } from "@/lib/error/handler";
```

When you see this pattern, do not "fix" the order. Treat the `init(...)` line as a barrier; groups apply within each segment.

## Anti-patterns

- ❌ External, alias, relative all mashed together with no blank lines.
- ❌ Two blank lines between groups (single blank only).
- ❌ Splitting `import type` away from `import` of the same module spec class.
- ❌ Reordering the segments of a Sentry/OTel pattern, breaking instrumentation.
- ❌ Sorting across group boundaries — sort _within_ each group only.
- ❌ `.ts` / `.tsx` extension on the specifier (`from "./foo.ts"`).
