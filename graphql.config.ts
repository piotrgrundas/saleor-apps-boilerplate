import "dotenv/config";
import type { IGraphQLConfig } from "graphql-config";

const saleorUrl = process.env.SALEOR_URL ?? "https://your-store.saleor.cloud";

const config: IGraphQLConfig = {
  projects: {
    saleor: {
      schema: `${saleorUrl}/graphql/`,
      documents: "src/**/saleor/**/*.graphql",
    },
    handler: {
      schema: "src/apps/handler/api/graphql/schema.graphql",
      documents: "src/apps/handler/**/*.graphql",
    },
  },
};

export default config;
