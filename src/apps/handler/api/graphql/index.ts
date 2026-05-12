import fs from "node:fs";
import path from "node:path";
import { createSchema, createYoga } from "graphql-yoga";
import { Hono } from "hono";

import { IS_DEV } from "@/constants";
import { resolvers } from "./resolvers";
import { createUserLoader } from "./resolvers/types/user/data-loaders";
import type { GraphQLContext } from "./types";

const schemaPath = path.resolve(new URL(".", import.meta.url).pathname, "schema.graphql");

let typeDefs: string;
try {
  typeDefs = fs.readFileSync(schemaPath, "utf-8");
} catch {
  // Fallback for bundled environments where file may not exist
  typeDefs = `
    type Query { posts: [Post!]! post(id: ID!): Post }
    type Mutation { createPost(input: CreatePostInput!): Post! deletePost(id: ID!): Boolean! }
    type Post { id: ID! title: String! content: String! author: User! createdAt: String! }
    type User { id: ID! name: String! email: String! }
    input CreatePostInput { title: String! content: String! authorId: ID! }
  `;
}

const yoga = createYoga<GraphQLContext>({
  schema: createSchema({
    typeDefs,
    resolvers,
  }),
  graphiql: IS_DEV,
  context: () => ({
    userLoader: createUserLoader(),
  }),
});

const graphqlApp = new Hono();

graphqlApp.all("/*", async (context) => {
  const response = await yoga.handle(context.req.raw);
  return response;
});

export { graphqlApp };
