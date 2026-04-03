import * as Types from "../../../../../graphql/saleor/schema";

import { DocumentTypeDecoration } from "@graphql-typed-document-node/core";
export type AppIdQueryVariables = Types.Exact<{ [key: string]: never }>;

export type AppIdQuery = { __typename?: "Query"; app?: { __typename?: "App"; id: string } | null };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>["__apiType"]>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const AppIdDocument = new TypedDocumentString(`
    query AppId {
  app {
    id
  }
}
    `) as unknown as TypedDocumentString<AppIdQuery, AppIdQueryVariables>;
