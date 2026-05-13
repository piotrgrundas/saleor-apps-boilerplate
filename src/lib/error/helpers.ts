import { HttpError } from "./base";

export const isHttpError = (error: unknown): error is HttpError => {
  return error instanceof HttpError;
};

export const getErrorMessage = (error: unknown, fallback = "Unknown error"): string => {
  return error instanceof Error ? error.message : fallback;
};

export const serializeError = (
  err: unknown,
): {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
} => {
  console.log(err);
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause instanceof Error ? serializeError(err.cause) : err.cause,
    };
  }

  return {
    name: typeof err,
    message: String(err),
  };
};
