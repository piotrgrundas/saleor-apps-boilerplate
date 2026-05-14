/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from '../schema';

import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type IssuingPrincipal_App_Fragment = { __typename: 'App', identifier: string | null };

export type IssuingPrincipal_User_Fragment = { __typename: 'User', email: string };

export type IssuingPrincipalFragment =
  | IssuingPrincipal_App_Fragment
  | IssuingPrincipal_User_Fragment
;

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
export const IssuingPrincipalFragmentDoc = new TypedDocumentString(`
    fragment IssuingPrincipal on IssuingPrincipal {
  __typename
  ... on App {
    identifier
  }
  ... on User {
    email
  }
}
    `, {"fragmentName":"IssuingPrincipal"}) as unknown as TypedDocumentString<IssuingPrincipalFragment, unknown>;