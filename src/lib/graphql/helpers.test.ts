import { describe, expect, it } from "vite-plus/test";

import { getOperationName } from "@/lib/graphql/helpers";

describe("getOperationName", () => {
  it("extracts query name", () => {
    expect(getOperationName("query GetUser { user { id } }")).toBe("GetUser");
  });

  it("extracts mutation name", () => {
    expect(
      getOperationName(
        "mutation CreatePost($input: PostInput!) { createPost(input: $input) { id } }",
      ),
    ).toBe("CreatePost");
  });

  it("returns null for anonymous operations", () => {
    expect(getOperationName("{ user { id } }")).toBeNull();
  });
});
