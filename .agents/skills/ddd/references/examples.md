# Worked example: generate-sitemap

Template for stubbing a new feature end-to-end. Task: build a sitemap for a Saleor channel, upload to storage, return the URL.

## 1. Domain entity — `src/domain/sitemap/sitemap.ts`

```typescript
import z from "zod";

export const sitemapSchema = z.object({
  channelSlug: z.string(),
  url: z.string().url(),
  generatedAt: z.coerce.date(),
});

export type Sitemap = z.infer<typeof sitemapSchema>;

// Named transitions — pure, named, no methods.
export const newSitemap = (
  { channelSlug, url, now }: { channelSlug: string; url: string; now: Date },
): Sitemap => ({ channelSlug, url, generatedAt: now });
```

## 2. Error scopes — `src/domain/errors/scopes/*.ts`

One file per scope. Scope = consumer's narrowing surface (a port, or a use-case with distinct failure modes).

```typescript
// src/domain/errors/scopes/sitemap-store.ts
import type { ErrorCodeFormat } from "../format.ts";

export const SITEMAP_STORE_ERROR_CODES = [
  "SITEMAP_STORE_UPLOAD_ERROR",
] as const satisfies readonly ErrorCodeFormat[];
export type SitemapStoreErrorCode = typeof SITEMAP_STORE_ERROR_CODES[number];
```

```typescript
// src/domain/errors/scopes/product-catalogue.ts
import type { ErrorCodeFormat } from "../format.ts";

export const PRODUCT_CATALOGUE_ERROR_CODES = [
  "PRODUCT_CATALOGUE_FETCH_ERROR",
] as const satisfies readonly ErrorCodeFormat[];
export type ProductCatalogueErrorCode =
  typeof PRODUCT_CATALOGUE_ERROR_CODES[number];
```

```typescript
// src/domain/errors/scopes/generate-sitemap.ts
import type { ErrorCodeFormat } from "../format.ts";

export const GENERATE_SITEMAP_ERROR_CODES = [
  "GENERATE_SITEMAP_BUILD_EMPTY_ERROR",
] as const satisfies readonly ErrorCodeFormat[];
export type GenerateSitemapErrorCode =
  typeof GENERATE_SITEMAP_ERROR_CODES[number];
```

Aggregate in `base.ts`:

```typescript
// src/domain/errors/base.ts
import { GENERATE_SITEMAP_ERROR_CODES } from "./scopes/generate-sitemap.ts";
import { PRODUCT_CATALOGUE_ERROR_CODES } from "./scopes/product-catalogue.ts";
import { SITEMAP_STORE_ERROR_CODES } from "./scopes/sitemap-store.ts";

export const ErrorCodes = [
  ...SITEMAP_STORE_ERROR_CODES,
  ...PRODUCT_CATALOGUE_ERROR_CODES,
  ...GENERATE_SITEMAP_ERROR_CODES,
  // ...existing scopes
] as const;
```

## 3. Ports — `src/domain/ports/*.ts`

TS types, not abstract classes.

```typescript
// src/domain/ports/sitemap-store.ts
import type { AsyncResult } from "@/domain/errors/result.ts";
import type { SitemapStoreErrorCode } from "@/domain/errors/scopes/sitemap-store.ts";

export type SitemapStore = {
  upload(input: {
    channelSlug: string;
    body: Uint8Array;
  }): AsyncResult<string, SitemapStoreErrorCode>;
};
```

```typescript
// src/domain/ports/product-catalogue.ts
import type { AsyncResult } from "@/domain/errors/result.ts";
import type { ProductCatalogueErrorCode } from "@/domain/errors/scopes/product-catalogue.ts";

export type ProductRef = { slug: string; updatedAt: Date };

export type ProductCatalogue = {
  listForChannel(
    channelSlug: string,
  ): AsyncResult<ProductRef[], ProductCatalogueErrorCode>;
};
```

## 4. Adapters — `src/infrastructure/<port>/<vendor>-<port>.ts`

Factory functions returning port-shaped objects.

```typescript
// src/infrastructure/sitemap-store/s3-sitemap-store.ts
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { err, ok } from "neverthrow";

import type { SitemapStore } from "@/domain/ports/sitemap-store.ts";

export const createS3SitemapStore = (bucket: string): SitemapStore => {
  const client = new S3Client();
  return {
    async upload({ channelSlug, body }) {
      try {
        await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: `sitemaps/${channelSlug}.xml`,
          Body: body,
        }));
        return ok(`https://${bucket}.s3.amazonaws.com/sitemaps/${channelSlug}.xml`);
      } catch (cause) {
        return err([{
          code: "SITEMAP_STORE_UPLOAD_ERROR",
          message: "Failed to upload sitemap to S3.",
          details: { cause, channelSlug, bucket },
        }]);
      }
    },
  };
};
```

`createSaleorProductCatalogue` follows the same shape — see `src/infrastructure/catalogue/saleor/saleor-catalogue.ts` for a live reference.

## 5. Use-case — `src/application/generate-sitemap-use-case.ts`

Factory function returning a curried handler.

```typescript
import { err, ok } from "neverthrow";

import type { AsyncResult } from "@/domain/errors/result.ts";
import type { GenerateSitemapErrorCode } from "@/domain/errors/scopes/generate-sitemap.ts";
import type { ProductCatalogueErrorCode } from "@/domain/errors/scopes/product-catalogue.ts";
import type { SitemapStoreErrorCode } from "@/domain/errors/scopes/sitemap-store.ts";
import { newSitemap, type Sitemap } from "@/domain/sitemap/sitemap.ts";
import type { ProductCatalogue } from "@/domain/ports/product-catalogue.ts";
import type { SitemapStore } from "@/domain/ports/sitemap-store.ts";
import type { LoggingProvider } from "@/lib/logging/types.ts";

import { buildSitemapXml } from "./sitemap/build-xml.ts";

type Deps = {
  catalogue: ProductCatalogue;
  store: SitemapStore;
  logger: LoggingProvider;
};

export type GenerateSitemapErrors =
  | ProductCatalogueErrorCode
  | SitemapStoreErrorCode
  | GenerateSitemapErrorCode;

export const generateSitemapUseCase =
  ({ catalogue, store, logger }: Deps) =>
  async (
    { channelSlug }: { channelSlug: string },
  ): AsyncResult<Sitemap, GenerateSitemapErrors> => {
    logger.info("Generating sitemap.", { channelSlug });

    const productsResult = await catalogue.listForChannel(channelSlug);
    if (productsResult.isErr()) return err(productsResult.error);

    const xml = buildSitemapXml(productsResult.value);

    if (xml.byteLength === 0) {
      return err([{
        code: "GENERATE_SITEMAP_BUILD_EMPTY_ERROR",
        message: "Built sitemap is empty — refusing to upload.",
        details: { channelSlug },
      }]);
    }

    const uploadResult = await store.upload({ channelSlug, body: xml });
    if (uploadResult.isErr()) return err(uploadResult.error);

    return ok(newSitemap({
      channelSlug,
      url: uploadResult.value,
      now: new Date(),
    }));
  };

export type GenerateSitemapUseCase = ReturnType<typeof generateSitemapUseCase>;
```

## 6. Container wiring — `src/apps/<app>/di/container.ts`

Adapters and use-cases are factory calls in DI bindings.

```typescript
import { generateSitemapUseCase } from "@/application/generate-sitemap-use-case.ts";
import { createGlobalContainer } from "@/di/container.ts";
import { createSaleorProductCatalogue } from "@/infrastructure/catalogue/saleor/saleor-catalogue.ts";
import { createS3SitemapStore } from "@/infrastructure/sitemap-store/s3-sitemap-store.ts";
import { baseSaleorClientFactory } from "@/lib/saleor/client/base.ts";

import { APP_CONFIG } from "../config.ts";

export const container = createGlobalContainer(APP_CONFIG)
  .add({
    sitemapBucket: () => APP_CONFIG.SITEMAP_BUCKET,
    batchPageSize: () => APP_CONFIG.BATCH_PAGE_SIZE,
    saleorClient: () =>
      baseSaleorClientFactory({ saleorDomain: APP_CONFIG.SALEOR_DOMAIN }),
  })
  .add((ctx) => ({
    productCatalogue: () =>
      createSaleorProductCatalogue({
        client: ctx.saleorClient,
        batchPageSize: ctx.batchPageSize,
      }),
    sitemapStore: () => createS3SitemapStore(ctx.sitemapBucket),
  }))
  .add((ctx) => ({
    generateSitemapUseCase: () =>
      generateSitemapUseCase({
        catalogue: ctx.productCatalogue,
        store: ctx.sitemapStore,
        logger: ctx.logger,
      }),
  }));
```

## 7. HTTP route — `src/apps/handler/api/rest/sitemap/routes.ts`

Boundary calls `container.items.generateSitemapUseCase(input)` directly. No `.execute()`.

```typescript
import { Hono } from "hono";
import z from "zod";

import { container } from "@/apps/handler/di/container.ts";
import { DomainError, DomainValidationError } from "@/lib/error/handler.ts";

const inputSchema = z.object({ channelSlug: z.string().min(1) });

export const sitemapRoute = new Hono().post("/sitemaps", async (c) => {
  const parsed = inputSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    throw new DomainValidationError([{
      code: "VALIDATION_ERROR",
      message: "Invalid input.",
      details: parsed.error.issues,
    }]);
  }

  const result = await container.items.generateSitemapUseCase(parsed.data);

  return result.match(
    (sitemap) => c.json(sitemap),
    (errors) => {
      const [first] = errors;
      switch (first.code) {
        case "PRODUCT_CATALOGUE_FETCH_ERROR":
        case "SITEMAP_STORE_UPLOAD_ERROR":
          throw new DomainError(502, errors);
        case "GENERATE_SITEMAP_BUILD_EMPTY_ERROR":
          throw new DomainError(500, errors);
        default: {
          const _exhaustive: never = first.code;
          throw new DomainError(500, errors);
        }
      }
    },
  );
});
```

The global `errorHandler` (registered via `app.onError(errorHandler)`) catches the `DomainError`, logs the typed cause, and renders the JSON response.

## 8. Test the use-case — `src/application/generate-sitemap.test.ts`

Mock the ports as `MagicMock<PortType>()`, invoke the factory, then call the bound function.

```typescript
import { ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateSitemapUseCase } from "@/application/generate-sitemap-use-case.ts";
import type { ProductCatalogue } from "@/domain/ports/product-catalogue.ts";
import type { SitemapStore } from "@/domain/ports/sitemap-store.ts";
import type { LoggingProvider } from "@/lib/logging/types.ts";
import { MagicMock } from "@/lib/test/mock.ts";

describe("generateSitemapUseCase", () => {
  let catalogue: ProductCatalogue;
  let store: SitemapStore;
  let logger: LoggingProvider;

  beforeEach(() => {
    catalogue = MagicMock<ProductCatalogue>();
    store = MagicMock<SitemapStore>();
    logger = MagicMock<LoggingProvider>();
  });

  it("should upload xml and return sitemap on success", async () => {
    // given
    vi.mocked(catalogue.listForChannel).mockResolvedValue(
      ok([{ slug: "p1", updatedAt: new Date() }]),
    );
    vi.mocked(store.upload).mockResolvedValue(ok("https://cdn/sitemaps/uk.xml"));
    const handle = generateSitemapUseCase({ catalogue, store, logger });

    // when
    const result = await handle({ channelSlug: "uk" });

    // then
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().url).toBe("https://cdn/sitemaps/uk.xml");
  });
});
```

## What the layering buys you

- Swap S3 for another store → write a new factory (`createGcsSitemapStore`), change one DI line.
- Test the use-case with `MagicMock<Port>()` — no Saleor, no S3, no HTTP.
- New error codes become compile errors at the route's exhaustive `switch`.
- `domain/` stays transportable: nothing mentions Saleor, S3, AWS, or Hono.
- Adding a new port = create `domain/ports/<port>.ts` + `domain/errors/scopes/<port>.ts` + at least one adapter in `infrastructure/<port>/` + DI wiring. The type system forces the consumer to update.
