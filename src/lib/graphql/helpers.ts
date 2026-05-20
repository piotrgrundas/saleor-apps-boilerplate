import { Maybe } from "@/lib/utils/types";

/**
 * Extracts the operation name from a GraphQL document string.
 */
export function getOperationName(query: string): string | null {
  const match = query.match(/(?:query|mutation|subscription)\s+(\w+)/);
  return match?.[1] ?? null;
}

interface Edge<T> {
  node: T;
}
interface Connection<T> {
  edges: Maybe<Array<Edge<T>>>;
}

export function mapEdgesToItems<T>(data: Maybe<Connection<T>>, defaultValue = []): T[] {
  return data?.edges?.map(({ node }) => node) ?? defaultValue;
}
