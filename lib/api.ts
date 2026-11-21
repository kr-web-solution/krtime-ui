import { API_BASE_URL } from "@/lib/config";
import {
  clearSession,
  getAccessToken,
  saveSession,
} from "@/lib/auth-storage";
import type { ApiErrorBody, TokenPair } from "@/lib/types";

export class ApiError extends Error {
  reason_code: string;
  status: number;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.status = status;
    this.reason_code = body.reason_code;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return new ApiError(response.status, body);
  } catch {
    return new ApiError(response.status, {
      reason_code: "http_error",
      message: response.statusText || "Request failed",
    });
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    clearSession();
    return null;
  }
  const data = (await response.json()) as TokenPair;
  saveSession(data.access_token, data.role, data.full_name);
  return data.access_token;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const useAuth = options.auth !== false;
  let token = useAuth ? getAccessToken() : null;
  if (useAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "include",
      signal: options.signal,
    });

  let response = await doFetch();

  if (response.status === 401 && useAuth) {
    token = await refreshAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      response = await doFetch();
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function loginRequest(email: string, password: string) {
  const data = await apiFetch<TokenPair>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  saveSession(data.access_token, data.role, data.full_name);
  return data;
}

export async function logoutRequest() {
  try {
    await apiFetch("/api/v1/auth/logout", { method: "POST", auth: false });
  } finally {
    clearSession();
  }
}
