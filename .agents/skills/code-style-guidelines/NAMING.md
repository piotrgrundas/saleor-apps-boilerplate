# Naming — literal, not jargon

In identifiers, test descriptions, comments, and log messages: use the literal mechanism (predicate, method name, abstract term), not coined metaphors or vendor-specific terms in storage/runtime-agnostic layers.

| ❌ jargon              | ✅ literal                                               |
| ---------------------- | -------------------------------------------------------- |
| `"on budget cut"`      | `"when shouldContinue returns false"`                    |
| `"ifAbsent race lost"` | `"when stateService.save returns written: false"`        |
| `clearOutBucket` (AWS) | `clearOutPrefix` (matches `StorageService.deletePrefix`) |
| `// race lost`         | `// save returned written: false — concurrent INIT won`  |

## Triggers to rewrite

Words that signal you're reaching for jargon when a literal name fits:

- `race`, `budget`, `magic`, `under the hood`
- `bucket` / `S3 path` / `Lambda invocation` outside the infrastructure layer
- Any vendor product name outside its adapter folder

## Why

- **Searchable** — `grep shouldContinue` finds every reference; `grep "budget cut"` finds nothing useful.
- **Onboarding-friendly** — new readers don't need shared lore to parse names.
- **Refactor-safe** — when the metaphor breaks (we don't have "budgets" anymore), literal names still describe behavior.
- **Vendor-neutral** — domain code reads the same whether storage is S3, GCS, or in-memory.
