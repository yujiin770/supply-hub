import { config } from "../config";

type ParamValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  params?: Record<string, ParamValue>;
  token?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

interface FastApiErrorBody {
  detail?:
    | string
    | Array<{ loc: (string | number)[]; msg: string; type: string }>
    | Record<string, unknown>;
}

async function parseError(response: Response): Promise<ApiError> {
  let body: FastApiErrorBody = {};
  try {
    body = await response.json();
  } catch {
    return new ApiError(response.status, response.statusText);
  }

  const { detail } = body;
  if (!detail) return new ApiError(response.status, response.statusText);
  if (typeof detail === "string") return new ApiError(response.status, detail);
  if (!Array.isArray(detail)) {
    const msg = (detail as Record<string, unknown>).message;
    return new ApiError(
      response.status,
      typeof msg === "string" ? msg : response.statusText,
      detail,
    );
  }
  const message = detail.map((e) => `${e.loc.join(".")}: ${e.msg}`).join("; ");
  return new ApiError(response.status, message, detail);
}

function buildUrl(path: string, params?: Record<string, ParamValue>): string {
  const url = `${config.apiBaseUrl}${path}`;
  if (!params) return url;
  const qs = Object.entries(params)
    .filter(([, v]) => v != null)
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");
  return qs ? `${url}?${qs}` : url;
}

function buildHeaders(token?: string, extra?: Record<string, string>): Headers {
  const h = new Headers({ "Content-Type": "application/json" });
  if (token) h.set("Authorization", `Bearer ${token}`);
  if (extra) Object.entries(extra).forEach(([k, v]) => h.set(k, v));
  return h;
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, token, headers, body } = options;
  const url = buildUrl(path, params);
  const res = await fetch(url, {
    method,
    headers: buildHeaders(token, headers),
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("POST", path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PUT", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PATCH", path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>("DELETE", path, opts),

  /** Multipart form upload — caller builds the FormData. */
  async postForm<T>(
    path: string,
    formData: FormData,
    opts: Pick<RequestOptions, "token"> = {},
  ): Promise<T> {
    const url = buildUrl(path);
    const headers = new Headers();
    if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);
    // Do NOT set Content-Type — browser sets it with boundary automatically.
    const res = await fetch(url, { method: "POST", headers, body: formData });
    if (!res.ok) throw await parseError(res);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  },
};
