import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

export type GraphqlResolver<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
) => TResult | Promise<TResult>;

export type GraphQLError = {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
};

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export type AnyVariables = Record<string, unknown>;

export type FetchOptions = Omit<RequestInit, "body" | "method" | "signal">;

export type { TypedDocumentNode };
