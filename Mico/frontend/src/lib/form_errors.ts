import { ApiError } from "./api";
import { toast } from "./toast";

/** Field-level errors keyed by field name. */
export type FieldErrors = Record<string, string>;

/**
 * Parses an ApiError. Returns field-level errors if the response is a FastAPI
 * 422 validation list; otherwise shows a toast and returns empty.
 */
export function parseApiError(
  err: unknown,
  opts: { toastOnGeneric?: boolean } = { toastOnGeneric: true },
): FieldErrors {
  if (!(err instanceof ApiError)) {
    if (opts.toastOnGeneric) toast.error("An unexpected error occurred.");
    return {};
  }

  // 422 with list → field errors
  if (err.status === 422 && Array.isArray(err.details)) {
    const fields: FieldErrors = {};
    for (const item of err.details as Array<{
      loc: (string | number)[];
      msg: string;
    }>) {
      const key = item.loc.filter((l) => typeof l === "string").join(".");
      if (key) fields[key] = item.msg;
    }
    return fields;
  }

  // 422 with custom array (our backend returns [{field, message}])
  if (err.status === 422 && Array.isArray(err.details)) {
    const fields: FieldErrors = {};
    for (const item of err.details as Array<{
      field?: string;
      message?: string;
      msg?: string;
    }>) {
      const key = item.field ?? "";
      if (key) fields[key] = item.message ?? item.msg ?? err.message;
    }
    return fields;
  }

  if (opts.toastOnGeneric) toast.error(err.message);
  return {};
}
