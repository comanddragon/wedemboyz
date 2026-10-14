import { AxiosError } from "axios";

/**
 * The backend's error envelope (core.exceptions.custom_exception_handler)
 * wraps DRF's default error body inconsistently depending on the error type:
 *
 *   - Serializer validation errors: { success: false, error: { detail: { field: ["msg"] }, code } }
 *   - Auth/permission errors:       { success: false, error: { detail: { detail: "msg" } }, code } }
 *   - Plain string details:         { success: false, error: { detail: "msg", code } }
 *
 * This normalizes all three into one human-readable string.
 */
export function getApiErrorMessage(error: unknown): string {
  if (!(error instanceof AxiosError)) {
    return "Something went wrong. Please try again.";
  }

  const body = error.response?.data as { error?: { detail?: unknown } } | undefined;
  const detail = body?.error?.detail;

  if (!detail) {
    return error.message || "Something went wrong. Please try again.";
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (typeof detail === "object" && detail !== null) {
    // Auth failures etc. come through as { detail: "message" }
    if ("detail" in detail && typeof (detail as { detail?: unknown }).detail === "string") {
      return (detail as { detail: string }).detail;
    }

    // Serializer validation errors: { field: ["msg", ...], ... }
    const messages = Object.entries(detail as Record<string, unknown>).flatMap(([field, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values.map((v) => (field === "non_field_errors" ? String(v) : `${field}: ${v}`));
    });
    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return "Something went wrong. Please try again.";
}
