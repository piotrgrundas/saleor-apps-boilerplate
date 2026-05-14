import type { DocumentTypeDecoration } from "@graphql-typed-document-node/core";
import { err, ok } from "neverthrow";

import type { AsyncResult } from "@/domain/errors/result";
import type { GraphqlErrorCode } from "@/domain/errors/scopes/graphql";
import type { Logger } from "@/domain/ports/logger";
import { getErrorMessage } from "@/lib/error/helpers";
import { getElapsedTime } from "@/lib/utils/timing";
import { isEmptyObject } from "@/lib/utils/type-guards";
import type { Maybe } from "@/lib/utils/types";

import { getOperationName } from "./helpers";
import type { AnyVariables, FetchOptions, GraphQLResponse } from "./types";

const DEFAULT_TIMEOUT_MS = 10_000;

export type GraphqlClient = ReturnType<typeof createGraphqlClient>;

/**
 * Minimal GraphQL-over-HTTP client returning `AsyncResult`s.
 *
 *   - `authToken` is passed per-call (request-scoped).
 *   - Timeout via `AbortSignal.timeout`; default 10s, override per-client.
 *   - Errors funneled into `GraphqlErrorCode` scope:
 *       `GRAPHQL_REQUEST_ERROR`         — fetch/network failure
 *       `GRAPHQL_TIMEOUT_ERROR`         — `AbortSignal.timeout` fired
 *       `GRAPHQL_HTTP_ERROR`            — non-2xx
 *       `GRAPHQL_INVALID_RESPONSE_ERROR`— body not valid JSON
 *       `GRAPHQL_RESPONSE_ERROR`        — `errors[]` in body
 */
export const createGraphqlClient = (
  url: string,
  opts: {
    logger: Logger;
    timeout?: number;
  },
) => ({
  execute: async <TResult = unknown, TVariables extends AnyVariables = AnyVariables>(
    query: DocumentTypeDecoration<TResult, TVariables> & { toString(): string },
    input?: {
      variables?: TVariables;
      authToken?: Maybe<string>;
      options?: FetchOptions;
    },
  ): AsyncResult<TResult, GraphqlErrorCode> => {
    const { logger, timeout = DEFAULT_TIMEOUT_MS } = opts;
    const { variables, authToken } = { ...input };

    const stringQuery = query.toString();
    const operationName = getOperationName(stringQuery) ?? "anonymous";
    const elapsed = getElapsedTime();

    let response: Response;

    try {
      response = await fetch(url, {
        ...input?.options,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...input?.options?.headers,
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          query: stringQuery,
          ...(variables && { variables }),
        }),
        signal: AbortSignal.timeout(timeout),
      });
    } catch (e) {
      const timedOut = e instanceof Error && e.name === "TimeoutError";
      return err([
        {
          code: timedOut ? "GRAPHQL_TIMEOUT_ERROR" : "GRAPHQL_REQUEST_ERROR",
          message: timedOut
            ? `GraphQL request timed out after ${timeout}ms (${operationName})`
            : `GraphQL request failed: ${getErrorMessage(e)}`,
          details: { cause: e, operationName, url },
        },
      ]);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "<unreadable>");
      logger.error("GraphQL HTTP error", {
        operationName,
        status: response.status,
        statusText: response.statusText,
        body: body.slice(0, 500),
      });

      return err([
        {
          code: "GRAPHQL_HTTP_ERROR",
          message: `GraphQL HTTP ${response.status} ${response.statusText} (${operationName})`,
          details: { status: response.status, body: body.slice(0, 500), operationName },
        },
      ]);
    }

    let responseJson: GraphQLResponse<TResult>;

    try {
      responseJson = (await response.json()) as GraphQLResponse<TResult>;
    } catch (e) {
      logger.error("GraphQL invalid response JSON", { error: e, operationName });

      return err([
        {
          code: "GRAPHQL_INVALID_RESPONSE_ERROR",
          message: `GraphQL response was not valid JSON (${operationName})`,
          details: { cause: e, operationName },
        },
      ]);
    }

    logger.info(
      `Executed ${operationName}, took ${elapsed()}ms.`,
      variables && !isEmptyObject(variables) ? { variables } : {},
    );

    if (responseJson.errors?.length) {
      logger.debug(`${operationName} response errors`, { errors: responseJson.errors });
      return err([
        {
          code: "GRAPHQL_RESPONSE_ERROR",
          message: responseJson.errors[0].message,
          details: { errors: responseJson.errors, operationName },
        },
      ]);
    }

    return ok(responseJson.data as TResult);
  },
});
