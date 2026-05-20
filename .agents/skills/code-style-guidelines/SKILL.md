---
name: code-style-guidelines
description: Project-local code style rules that apply regardless of whether the formatter or linter catches them. Covers import grouping, function argument shapes (single destructured object beyond one param), literal-over-jargon naming, and comment form by length (`//` for single-line, `/** */` for multi-line). Use whenever writing or modifying any `.ts` / `.tsx` file. Triggers: "add an import", "fix import order", "clean up this file", "the imports look messy", designing a function/method/port signature, naming a variable / test / log message, writing/converting any comment, any new module creation, any code review of style concerns the formatter doesn't catch.
---

# Code style guidelines

Style is the source of truth. Tooling may or may not enforce a given rule — apply the convention anyway. If the linter passes on a file that violates these rules, the file is still wrong.

> **Universal TypeScript style** (`prefer type over interface`, `import type` for type-only imports) lives in the user-level `typescript-style` skill at `~/.claude/skills/typescript-style/SKILL.md`. Apply both — this project skill is additive.

## Rules at a glance

| Topic           | Rule                                                                                            | Reference                            |
| --------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| Import grouping | 3 groups (external → `@/...` → relative), single blank line between, alphabetical within        | [IMPORTS.md](IMPORTS.md)             |
| Function args   | 2+ params → single destructured object; 1 param → positional. Same rule for class constructors. | [FUNCTION-ARGS.md](FUNCTION-ARGS.md) |
| Naming          | Literal mechanism, not jargon / metaphors / vendor terms outside infra                          | [NAMING.md](NAMING.md)               |
| Comments        | Single-line → `// text`; multi-line (2+ lines) → `/** ... */` block. No mixing.                 | [COMMENTS.md](COMMENTS.md)           |

## Universal: no file extensions in imports

No `.ts` / `.tsx` on import specifiers — bundler resolver handles them.

```typescript
// ✅
import { foo } from "./bar";
import type { Baz } from "@/domain/baz";

// ❌
import { foo } from "./bar.ts";
```

## When to read which reference

- Writing/modifying imports, or seeing imports in code review → [IMPORTS.md](IMPORTS.md)
- Defining a function, method, port signature, factory, or class constructor → [FUNCTION-ARGS.md](FUNCTION-ARGS.md)
- Naming any identifier, test description, log message, or comment → [NAMING.md](NAMING.md)
- Writing or converting any comment, or seeing JSDoc in source → [COMMENTS.md](COMMENTS.md)

## Workflow

1. Identify which topic applies (imports / args / naming).
2. Read the matching reference file for full rule + examples + anti-patterns.
3. Apply convention even if tooling doesn't flag the violation.
4. On review, flag any of the listed anti-patterns regardless of linter output.
