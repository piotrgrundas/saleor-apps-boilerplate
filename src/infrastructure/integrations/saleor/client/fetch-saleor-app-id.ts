import { err, ok } from "neverthrow";

import type { AsyncResult } from "@/domain/errors/result";
import type { SaleorErrorCode } from "@/domain/errors/scopes/saleor";
import { getErrorMessage } from "@/lib/error/helpers";
import type { GraphQLResponse } from "@/lib/graphql/types";
import {
  AppIdDocument,
  type AppIdQuery,
} from "@/infrastructure/integrations/saleor/graphql/AppIdQuery.generated";

export type FetchSaleorAppIdInput = {
  apiUrl: string;
  token: string;
};

export type FetchSaleorAppId = (
  input: FetchSaleorAppIdInput,
) => AsyncResult<string, SaleorErrorCode>;

export const fetchSaleorAppId: FetchSaleorAppId = async ({ apiUrl, token }) => {
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: AppIdDocument.toString() }),
    });
  } catch (e) {
    return err([
      {
        code: "SALEOR_REQUEST_ERROR",
        message: getErrorMessage(e),
        details: { cause: e },
      },
    ]);
  }

  if (!response.ok) {
    return err([
      {
        code: "SALEOR_REQUEST_ERROR",
        message: `Saleor API request failed: ${response.status}`,
      },
    ]);
  }

  const json = (await response.json()) as GraphQLResponse<AppIdQuery>;

  if (json.errors?.length) {
    return err([
      {
        code: "SALEOR_GRAPHQL_ERROR",
        message: `Saleor GraphQL error: ${json.errors[0].message}`,
        details: { errors: json.errors },
      },
    ]);
  }

  const appId = json.data?.app?.id;

  if (!appId) {
    return err([
      {
        code: "SALEOR_APP_NOT_FOUND_ERROR",
        message: "App ID not found in Saleor response",
      },
    ]);
  }

  return ok(appId);
};
