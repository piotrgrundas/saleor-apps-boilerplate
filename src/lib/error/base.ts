import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { Error as DomainErr, ErrorCode } from "@/domain/errors/base";

export type SerializedError = {
  error: string;
  message: string;
  statusCode: number;
  code?: ErrorCode;
  errors?: DomainErr[];
  details?: unknown;
};

export class HttpError extends HTTPException {
  public readonly error: string;
  public readonly details?: unknown;

  constructor(statusCode: ContentfulStatusCode, error: string, message: string, details?: unknown) {
    super(statusCode, { message });
    this.error = error;
    this.details = details;
  }

  serialize(): SerializedError {
    return {
      error: this.error,
      message: this.message,
      statusCode: this.status,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(400, "Bad Request", message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized") {
    super(401, "Unauthorized", message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(403, "Forbidden", message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not Found") {
    super(404, "Not Found", message);
  }
}

export class InternalServerError extends HttpError {
  constructor(message = "Internal Server Error") {
    super(500, "Internal Server Error", message);
  }
}

export class ValidationError extends BadRequestError {
  constructor(details: unknown) {
    super("Validation failed", details);
  }
}

export class DomainException extends HttpError {
  public readonly errors: DomainErr[];

  constructor(statusCode: ContentfulStatusCode, errors: DomainErr[]) {
    const [first] = errors;
    super(statusCode, first?.code ?? "DOMAIN_ERROR", first?.message ?? "Domain error");
    this.errors = errors;
  }

  override serialize(): SerializedError {
    const [first] = this.errors;
    return {
      ...super.serialize(),
      ...(first ? { code: first.code } : {}),
      errors: this.errors,
    };
  }
}

export class DomainValidationError extends DomainException {
  constructor(errors: DomainErr[]) {
    super(400, errors);
  }
}

export class DomainUnauthorizedError extends DomainException {
  constructor(errors: DomainErr[]) {
    super(401, errors);
  }
}

export class DomainForbiddenError extends DomainException {
  constructor(errors: DomainErr[]) {
    super(403, errors);
  }
}

export class DomainNotFoundError extends DomainException {
  constructor(errors: DomainErr[]) {
    super(404, errors);
  }
}

export class ForbiddenException extends DomainException {
  constructor(errors: DomainErr[]) {
    super(403, errors);
  }
}

export class BadGatewayException extends DomainException {
  constructor(errors: DomainErr[]) {
    super(502, errors);
  }
}

export class UnprocessableEntityException extends DomainException {
  constructor(errors: DomainErr[]) {
    super(422, errors);
  }
}

export class ServiceUnavailableException extends DomainException {
  constructor(errors: DomainErr[]) {
    super(503, errors);
  }
}

export class ValidationException extends DomainException {
  constructor(errors: DomainErr[]) {
    super(400, errors);
  }
}
