# Integrations & infrastructure layout

Three folder patterns coexist under `src/infrastructure/`. Pick the right one per code unit.

## 1. Port-first — `<port>/<vendor>/`

Generic infrastructure ports with potential lib swap.

```
infrastructure/
  app-config/aws/aws-secret-manager-app-config-repository.ts
  logging/sentry/, logging/ts-log/
```

Use when:

- Port is a genuine abstraction (storage, logging, config persistence)
- Multiple vendors plausible (or one today + tests + maybe lib swap)
- Capability is vendor-neutral

## 2. Spec-scope — `<standard>/<concept>/`

IETF/RFC standards families. Group by spec, not by impl library.

```
infrastructure/jose/
  jwks/jwks-repository-factory.ts   # RFC 7517
  jwt/jwt-service.ts                # RFC 7519
  auth/jose-auth-service.ts         # JWS verification
```

Use when:

- Code implements concepts from a published spec family
- Multiple related concepts cluster naturally
- Folder name = the spec (`jose`, `oauth`, `oidc`), not the lib

The folder name communicates "JOSE spec family." Files inside may use any compliant lib. Drop lib-prefix on filenames — folder context says it.

## 3. Vendor-first — `integrations/<vendor>/`

External systems with proprietary protocol. Everything for one vendor in one tree.

```
infrastructure/integrations/saleor/
  install/                # POST /register handshake
    saleor-install.ts
    schema.ts             # register payload zod schema
  webhook/                # webhook verification
    schema.ts             # header + body envelope zod
    types.ts              # HandlerContext, WebhookData
  middleware/             # Hono mw composing JWS verify + zod
  client/                 # Saleor API calls
    fetch-saleor-app-id.ts
  graphql/                # codegen + ops (schema + .generated)
  header/, transaction/   # protocol schemas
  app-config/             # tenant config schema
  env/                    # env-side connection config
  types.ts                # Saleor SDK types
```

Use when:

- Vendor has proprietary protocol/handshake
- Multiple related concerns cluster (install + webhook + client + schemas)
- "Find all Saleor stuff" is a real query

## Choosing between patterns

| Question                                               | Pattern      |
| ------------------------------------------------------ | ------------ |
| Does the port abstract over multiple libs/impls today? | Port-first   |
| Is this code from a public spec family (RFC, IETF)?    | Spec-scope   |
| Is this proprietary protocol of an external system?    | Vendor-first |

Default: port-first. Promote to spec-scope or vendor-first when ≥3 related concerns cluster.

## Integrations are OUT of DI

`integrations/<vendor>/` code is composed at the call site, not registered in the global container.

```typescript
// src/di/container.ts (global) — primitives only
.add({ logger: ... })
.add({ jwksRepository: () => createJwksRepositoryFactory() })
.add((ctx) => ({ joseAuthService: () => createJoseAuthService({ jwksRepository: ctx.jwksRepository }) }))
.add({ appConfigRepository: () => createAppConfig() })
```

```typescript
// src/apps/handler/api/rest/saleor/routes.tsx — composition + ctx threading
const saleorInstall = createSaleorInstall({
  appConfigRepository: container.items.appConfigRepository,
  fetchAppId: fetchSaleorAppId,
  jwksRepository: container.items.jwksRepository,
});

// in handler:
const ctx = { logger: context.get("logger") };
await saleorInstall(input, ctx);
```

Note: `logger` is NOT in `Deps`. It lives in `Context` and is threaded per call. See [context.md](context.md).

Reasons:

- Container stays small + meaningful (shared primitives)
- Future vendors (Shopify, Stripe) don't bloat DI
- Composition at use site is explicit + reads in context
- N=1 caller doesn't justify DI registration

Per-app composition file (`apps/<app>/integrations/<vendor>.ts`) is justified only when **multiple routes** share construction. N=1 → inline.

## Plain functions over single-method "Services"

A port type with one method = function in tuxedo. Use the function.

```typescript
// ❌ Anti-pattern
type StoreService = {
  getAppId(input: { apiUrl: string; token: string }): AsyncResult<string, StoreErrorCode>;
};

// ✅ Function
export type FetchSaleorAppId = (input: {
  apiUrl: string;
  token: string;
}) => AsyncResult<string, SaleorErrorCode>;

export const fetchSaleorAppId: FetchSaleorAppId = async ({ apiUrl, token }) => { ... };
```

Inject as function dep, not service:

```typescript
type Deps = {
  fetchAppId: FetchSaleorAppId;
  // ...
};
```

Tests pass plain async functions. No `createMockService()`.

Promote to service/port when ≥2 methods cluster naturally (`SaleorClient` with `getAppId` + `getOrder` + `getCustomer`).

## Factory-of-instance shape

When a port needs internal caches or shared state across calls, the adapter is a **factory function returning the port instance directly**. No separate `XxxFactory` type — the function's signature documents it.

```typescript
// domain/ports/jwks-repository.ts
export type JWKSRepositoryOptions = {
  cacheTtlSeconds?: number;
};

export type JWKSRepository = {
  get(
    opts: { issuer: string; forceRefresh?: boolean },
    ctx: Context,
  ): AsyncResult<JsonWebKeySet, JwksErrorCode>;
  set(opts: { issuer: string; jwks: JsonWebKeySet }, ctx: Context): AsyncResult<void>;
};
```

```typescript
// infrastructure/jose/jwks/memory/jwks-memory-repository-factory.ts
export const createJwksRepositoryFactory = (
  opts?: JWKSRepositoryOptions,
): JWKSRepository => {
  const cache = new NodeCache(...);
  return { get(...) { ... }, set(...) { ... } };
};
```

- Factory takes **construction options** (cache TTL — things bound for instance lifetime). **Not `logger`** — that comes per call via `Context`.
- Options type lives in `domain/ports/<port>.ts` so multiple adapters share it.
- Returns the port instance. Per-call params (issuer, tenantId) AND `ctx: Context` arrive at each method invocation.
- DI stores the **instance**:

```typescript
.add({
  jwksRepository: () => createJwksRepositoryFactory({ cacheTtlSeconds: 86400 }),
})
```

The factory function IS the adapter export. DI invokes it once. Consumers receive the instance and pass `ctx` per call.

Use when:

- Single global instance shared across requests
- Per-call params (issuer, tenantId) vary
- Internal cache keyed by per-call value

Don't use when:

- Each consumer wants its own instance (return adapter directly)
- No construction-time configuration at all

## Schemas co-located with their concern

Schemas live with the code that uses them, not in `domain/`.

```
infrastructure/integrations/saleor/
  install/schema.ts        # saleorRegisterPayloadSchema (POST body)
  webhook/schema.ts        # saleorWebhookHeadersSchema, webhookDataSchema
  app-config/schema.ts     # saleorAppConfigSchema (persisted tenant config)
  env/schema.ts            # saleorEnvSchema (env vars)
```

Domain `app-config.ts` is anti-pattern when the "AppConfig" is vendor-flavored — fields like `saleorDomain`, `saleorApiUrl` belong with Saleor integration, not domain.

Cross-cutting types stay in `domain/` only when genuinely vendor-neutral.

## Method naming — variant suffix

Variants of the same operation use a suffix, not a prefix.

```typescript
// ✅ Groups alphabetically + autocomplete
verifyJWS(...)
verifyJWSDetached(...)

// ❌ Scatters
verifyDetachedJWS(...)
verifyJWS(...)
```

Apply to ports, factory exports, helpers.

## Error code prefix = emitter ownership

Prefix names who emits, not abstract layer.

```typescript
// ✅
"SALEOR_REQUEST_ERROR"; // Saleor API request failed
"SALEOR_APP_NOT_FOUND_ERROR";
"JWKS_FETCH_ERROR"; // JWKS endpoint fetch failed
"SALEOR_INSTALL_DOMAIN_NOT_ALLOWED_ERROR";

// ❌ Lies about ownership
"STORE_REQUEST_ERROR"; // What store? Generic name hides Saleor specificity
```

Rename codes when their emitter renames. Error scope files mirror the emitter name (`scopes/saleor.ts`, `scopes/jwks.ts`, `scopes/saleor-install.ts`).
