/**
 * Turns a caught value into a human-readable message.
 *
 * Use this instead of `catch (e: any)` + `e.message`: `unknown` is safe (the
 * compiler forces you to narrow) and this still handles the shapes the API
 * layer can produce - a thrown Error, a plain string, or an API error payload.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (typeof error === "string" && error.trim()) return error;

  if (error instanceof Error && error.message) return error.message;

  if (error && typeof error === "object") {
    // API error payloads, in case a raw response ever reaches a catch block.
    const record = error as Record<string, unknown>;
    if (typeof record.error === "string" && record.error) return record.error;
    if (typeof record.message === "string" && record.message) return record.message;
  }

  return fallback;
}