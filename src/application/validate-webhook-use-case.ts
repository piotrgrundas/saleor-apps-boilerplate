import { err, ok } from "neverthrow";

import type { AsyncResult } from "@/domain/errors/result";
import type { ValidateWebhookErrorCode } from "@/domain/errors/scopes/validate-webhook";
import type { StoreService, WebhookData } from "@/domain/ports/store-service";

export type ValidateWebhookInput = {
  headers: Record<string, string | undefined>;
  body: string;
};

export type ValidateWebhookOutput = WebhookData;

type Deps = {
  storeService: StoreService;
};

export const validateWebhookUseCase =
  ({ storeService }: Deps) =>
  async (
    input: ValidateWebhookInput,
  ): AsyncResult<ValidateWebhookOutput, ValidateWebhookErrorCode> => {
    const result = await storeService.verifyWebhook({ headers: input.headers, body: input.body });

    if (result.isErr()) {
      const first = result.error[0];
      const code: ValidateWebhookErrorCode =
        first?.code === "STORE_WEBHOOK_HEADERS_ERROR"
          ? "VALIDATE_WEBHOOK_HEADERS_ERROR"
          : "VALIDATE_WEBHOOK_SIGNATURE_ERROR";

      return err([
        {
          code,
          message: first?.message ?? "Webhook validation failed",
          details: { cause: result.error },
        },
      ]);
    }

    return ok(result.value);
  };

export type ValidateWebhookUseCase = ReturnType<typeof validateWebhookUseCase>;
