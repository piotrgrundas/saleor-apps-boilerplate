import { describe, expect } from "vite-plus/test";

import { it } from "@/lib/test/it";

import { parseEditorJsToText } from "./editorjs";

describe("parseEditorJsToText", () => {
  it("should return empty string when input is null", () => {
    // given
    const input = null;

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe("");
  });

  it("should return empty string when input is undefined", () => {
    // given
    const input = undefined;

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe("");
  });

  it("should return empty string when input is empty string", () => {
    // given
    const input = "";

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe("");
  });

  it("should return empty string when JSON is malformed", () => {
    // given
    const input = "{not valid json";

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe("");
  });

  it("should return empty string when blocks field is missing", () => {
    // given
    const input = JSON.stringify({ time: 123, version: "2.30.7" });

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe("");
  });

  it("should return empty string when blocks array is empty", () => {
    // given
    const input = JSON.stringify({ blocks: [] });

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe("");
  });

  it("should return text from a single paragraph block", () => {
    // given
    const input = JSON.stringify({
      blocks: [{ id: "a", type: "paragraph", data: { text: "Hello world" } }],
    });
    const expected = "Hello world";

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe(expected);
  });

  it("should join multiple block texts with a single space", () => {
    // given
    const input = JSON.stringify({
      blocks: [
        { id: "a", type: "paragraph", data: { text: "First" } },
        { id: "b", type: "paragraph", data: { text: "Second" } },
        { id: "c", type: "paragraph", data: { text: "Third" } },
      ],
    });
    const expected = "First Second Third";

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe(expected);
  });

  it("should skip blocks without a data.text field", () => {
    // given
    const input = JSON.stringify({
      blocks: [
        { id: "a", type: "paragraph", data: { text: "Para" } },
        { id: "b", type: "list", data: { items: ["x", "y"], style: "unordered" } },
        { id: "c", type: "header", data: { text: "Heading" } },
      ],
    });
    const expected = "Para Heading";

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe(expected);
  });

  it("should skip blocks where data.text is the empty string", () => {
    // given
    const input = JSON.stringify({
      blocks: [
        { id: "a", type: "paragraph", data: { text: "" } },
        { id: "b", type: "paragraph", data: { text: "Real text" } },
        { id: "c", type: "paragraph", data: { text: "" } },
      ],
    });
    const expected = "Real text";

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe(expected);
  });

  it("should trim leading and trailing whitespace from final output", () => {
    // given
    const input = JSON.stringify({
      blocks: [{ id: "a", type: "paragraph", data: { text: "  trim me  " } }],
    });
    const expected = "trim me";

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe(expected);
  });

  it("should preserve unicode characters in extracted text", () => {
    // given
    const input = JSON.stringify({
      blocks: [
        {
          id: "a",
          type: "paragraph",
          data: { text: "Ten wisiorek wygląda jak zamknięte w żywicy wspomnienie." },
        },
      ],
    });
    const expected = "Ten wisiorek wygląda jak zamknięte w żywicy wspomnienie.";

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe(expected);
  });

  it("should preserve embedded HTML in text content verbatim", () => {
    // given
    const input = JSON.stringify({
      blocks: [{ id: "a", type: "paragraph", data: { text: "<b>Bold</b>&nbsp;tag" } }],
    });
    const expected = "<b>Bold</b>&nbsp;tag";

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe(expected);
  });

  it("should join paragraph and header text from a real Saleor description payload", () => {
    // given
    const input = JSON.stringify({
      time: 1778704246975,
      version: "2.30.7",
      blocks: [
        {
          id: "2zDMWkTqCu",
          type: "paragraph",
          data: {
            text: "Ten wisiorek wygląda jak zamknięte w żywicy wspomnienie samego dna oceanu.",
          },
        },
        {
          id: "M0tmrIxUNg",
          type: "paragraph",
          data: {
            text: "W jego wnętrzu spoczywa meduza, jakby zawieszona pomiędzy istnieniem a snem.",
          },
        },
        {
          id: "abc",
          type: "list",
          data: { items: ["item1", "item2"], style: "unordered" },
        },
      ],
    });
    const expected =
      "Ten wisiorek wygląda jak zamknięte w żywicy wspomnienie samego dna oceanu. " +
      "W jego wnętrzu spoczywa meduza, jakby zawieszona pomiędzy istnieniem a snem.";

    // when
    const result = parseEditorJsToText(input);

    // then
    expect(result).toBe(expected);
  });
});
