import { logger } from "./logger.js";

export interface ProxyOptions {
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
  responseType?: "json" | "buffer";
  timeoutMs: number;
}

export interface ProxyResult {
  status: number;
  data: unknown;
}

/**
 * Forward a request to an upstream service.
 * Throws on network errors and timeouts.
 * Does NOT throw on non-2xx responses — returns status + body for the caller to handle.
 */
export async function proxyToUpstream(
  baseUrl: string,
  path: string,
  options: ProxyOptions,
): Promise<ProxyResult> {
  const url = `${baseUrl}${path}`;
  const log = logger.child({ upstream: url, method: options.method });

  const res = await fetch(url, {
    method: options.method,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(options.timeoutMs),
  });

  if (options.responseType === "buffer") {
    const buffer = Buffer.from(await res.arrayBuffer());
    return { status: res.status, data: buffer };
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    log.warn({ status: res.status, data }, "upstream returned non-2xx");
  }

  return { status: res.status, data };
}
