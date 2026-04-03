export interface StoreErrorDefs {
  STORE_REQUEST_ERROR: never;
  STORE_GRAPHQL_ERROR: never;
  STORE_APP_NOT_FOUND_ERROR: never;
  STORE_WEBHOOK_HEADERS_ERROR: never;
  STORE_WEBHOOK_SIGNATURE_ERROR: never;
}
export type StoreErrorCode = keyof StoreErrorDefs;
