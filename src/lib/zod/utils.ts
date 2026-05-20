import { z, ZodType } from "zod";

/**
 * Formats Zod errors into a human-readable string.
 */
export function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    })
    .join("; ");
}

export const parseJSON = <T extends ZodType>(schema: T) =>
  z
    .string()
    .transform((str, ctx) => {
      try {
        return JSON.parse(str);
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message: `Invalid JSON - ${(error as Error).message}`,
          fatal: true,
        });
      }
    })
    .pipe(schema);
