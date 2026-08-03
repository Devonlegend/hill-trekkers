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
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(data?.detail, res.status);
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
    } else if (detail && typeof detail === "object") {
      const d = (detail as { code?: string; message?: string });
      code = d.code;
      if (d.message) message = d.message;
    }
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}