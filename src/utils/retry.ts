export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * Retries an async operation with exponential backoff. On HTTP 429
 * responses, honors a Retry-After style hint if the error carries one,
 * otherwise backs off instead of hammering the provider.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  { maxRetries = 3, baseDelayMs = 500 }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      if (isExplicitlyNonRetryable(error)) break;

      const retryAfterMs = getRetryAfterMs(error);
      const backoffMs = retryAfterMs ?? baseDelayMs * 2 ** attempt;
      await sleep(backoffMs);
    }
  }

  throw lastError;
}

function isExplicitlyNonRetryable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "retryable" in error &&
    (error as { retryable?: unknown }).retryable === false
  );
}

function getRetryAfterMs(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "retryAfterMs" in error &&
    typeof (error as { retryAfterMs?: unknown }).retryAfterMs === "number"
  ) {
    return (error as { retryAfterMs: number }).retryAfterMs;
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
