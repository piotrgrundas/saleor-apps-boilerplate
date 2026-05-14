/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from '../../../../../../../infrastructure/integrations/saleor/graphql/schema';

import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type ProductUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type ProductUpdatedSubscription = { event:
    | { product: { id: string, name: string, slug: string, updatedAt: unknown } | null }
    | Record<PropertyKey, never>
   | null };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
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

export const ProductUpdatedDocument = new TypedDocumentString(`
    subscription ProductUpdated {
  event {
    ... on ProductUpdated {
      product {
        id
        name
        slug
        updatedAt
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ProductUpdatedSubscription, ProductUpdatedSubscriptionVariables>;