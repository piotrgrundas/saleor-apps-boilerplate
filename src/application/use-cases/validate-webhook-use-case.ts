import { err, ok } from "neverthrow";

import type { ValidateWebhookErrorCode } from "@/application/domain/objects/error";
import type { AsyncDomainResult } from "@/application/domain/objects/result";
import type { StoreService, WebhookData } from "@/application/domain/services/store-service";
import type { UseCase } from "@/application/domain/use-case";

export interface ValidateWebhookInput {
  headers: Record<string, string | undefined>;
  body: string;
}

export type ValidateWebhookOutput = WebhookData;

export class ValidateWebhookUseCase implements UseCase<
  ValidateWebhookInput,
  ValidateWebhookOutput,
  ValidateWebhookErrorCode
> {
  constructor(private __storeService: StoreService) {}

  async execute(
    input: ValidateWebhookInput,
  ): AsyncDomainResult<ValidateWebhookOutput, ValidateWebhookErrorCode> {
    const result = await this.__storeService.verifyWebhook(input.headers, input.body);

    if (result.isErr()) {
      const code =
        result.error.code === "STORE_WEBHOOK_HEADERS_ERROR"
          ? "VALIDATE_WEBHOOK_HEADERS_ERROR"
          : "VALIDATE_WEBHOOK_SIGNATURE_ERROR";

      return err({
        code,
        message: result.error.message,
        cause: result.error,
      });
    }

    return ok(result.value);
  }
}
