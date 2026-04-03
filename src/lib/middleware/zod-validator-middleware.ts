import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { ValidationError } from "@/lib/error/base";

type ValidationTarget = "json" | "query" | "param" | "header" | "form";

/**
 * Wraps @hono/zod-validator to throw a ValidationError on failure
 * instead of returning a raw error response.
 */
export function zodValidatorMiddleware<Target extends ValidationTarget, T extends z.ZodTypeAny>(
  target: Target,
  schema: T,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new ValidationError(z.flattenError(result.error));
    }
  });
}
