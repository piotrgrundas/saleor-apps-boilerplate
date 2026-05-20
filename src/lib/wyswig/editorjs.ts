export type EditorJsBlock = { data?: { text?: string } };
export type EditorJsDoc = { blocks?: EditorJsBlock[] };

/**
 * Parses EditorJS rich-text JSON to plain text by joining `block.data.text`
 * across all blocks. Returns empty string on parse failure or missing input.
 */
export const parseEditorJsToText = (json: string | null | undefined): string => {
  if (!json) return "";
  try {
    const data = JSON.parse(json) as EditorJsDoc;
    return (data.blocks ?? [])
      .map((b) => b.data?.text ?? "")
      .filter((t) => t.length > 0)
      .join(" ")
      .trim();
  } catch {
    return "";
  }
};
