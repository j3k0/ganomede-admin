import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "./logger.js";

export class UpstreamError extends Error {
  public readonly statusCode: number;
  public readonly upstream: unknown;

  constructor(status: number, data: unknown) {
    super(`Upstream returned ${status}`);
    this.name = "UpstreamError";
    this.statusCode = status;
    this.upstream = data;
  }
}

export class ApiError extends Error {
  public readonly statusCode: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = status;
  }
}

/**
 * Express error handling middleware. Must be registered last (4-arg signature).
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      details: err.issues,
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof UpstreamError) {
    res.status(502).json({
      error: "Upstream service error",
      upstream: err.upstream,
    });
    return;
  }

  if (err.name === "AbortError" || err.name === "TimeoutError") {
    res.status(504).json({ error: "Upstream service timeout" });
    return;
  }

  // Network errors: check both the error itself and its cause (fetch wraps errors)
  const networkCode = (err as NodeJS.ErrnoException).code
    ?? (err.cause as NodeJS.ErrnoException | undefined)?.code;
  if (networkCode === "ECONNREFUSED" || networkCode === "ENOTFOUND") {
    res.status(503).json({ error: "Upstream service unavailable" });
    return;
  }

  // Unexpected error
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
