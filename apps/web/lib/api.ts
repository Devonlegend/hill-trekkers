export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const body = data as { detail?: unknown } | null;
    if (data === null || body?.detail === undefined) {
      // Non-JSON body or unexpected shape (proxy error page, 502/HTML) — no detail to extract.
      throw new ApiError("Request failed", res.status);
    }
    throw new ApiError(body.detail, res.status);
  }
  return data as T;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(detail: unknown, status: number) {
    let message = "Something went wrong";
    let code: string | undefined;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      // FastAPI 422 validation errors: `detail: [ { loc, msg, type }, ... ]`.
      const first = detail as { loc?: unknown[]; msg?: string }[];
      message = first[0]?.msg ?? message;
      code = "VALIDATION_ERROR";
    } else if (detail && typeof detail === "object") {
      const d = detail as { code?: string; message?: string };
      code = d.code;
      if (d.message) message = d.message;
    }
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}