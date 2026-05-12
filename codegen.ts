import "dotenv/config";
import type { CodegenConfig } from "@graphql-codegen/cli";

const saleorUrl = process.env.SALEOR_URL ?? "https://your-store.saleor.cloud";

const config: CodegenConfig = {
  overwrite: true,
  generates: {
    // Saleor remote schema types
    "src/infrastructure/integrations/saleor/graphql/schema.ts": {
      schema: `${saleorUrl}/graphql/`,
      plugins: ["typescript"],
      config: {
        enumsAsTypes: true,
        futureProofEnums: true,
      },
    },
    // Saleor operations (near-operation-file)
    "src/": {
      schema: `${saleorUrl}/graphql/`,
      documents: ["src/infrastructure/integrations/saleor/graphql/**/*.graphql"],
      preset: "near-operation-file",
      presetConfig: {
        extension: ".generated.ts",
        baseTypesPath: "infrastructure/integrations/saleor/graphql/schema.ts",
      },
      plugins: ["typescript-operations", "typed-document-node"],
      config: {
        enumsAsTypes: true,
        futureProofEnums: true,
        documentMode: "string",
      },
    },
    // Custom GraphQL API types (handler app)
    "src/apps/handler/api/graphql/schema.ts": {
      schema: "src/apps/handler/api/graphql/schema.graphql",
      plugins: ["typescript"],
      config: {
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
