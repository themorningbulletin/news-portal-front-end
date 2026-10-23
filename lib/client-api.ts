"use client";

/**
 * Browser-side API client. Requests go to the same origin (/api/v1 is
 * proxied to the API), so the HttpOnly session cookie travels automatically.
 * State-changing requests carry the CSRF token, which lives only in memory.
 */

export interface Me {
  id: string;
  email: string | null;
  displayName: string | null;
  role: "reader" | "author" | "editor" | "admin" | "ad_manager" | "moderator";
  canPublish: boolean;
  permissions: string[];
  author: { isPublic: boolean; slug: string | null; name: { bn?: string; en?: string }; bio: { bn?: string; en?: string } };
  preferences: { theme: "system" | "light" | "dark"; textSize: "sm" | "md" | "lg" | "xl"; locale?: "bn" | "en" };
  followedCategories: string[];
  followedTags: string[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

async function ensureCsrf(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken;
  const res = await fetch("/api/v1/auth/csrf", { credentials: "same-origin", cache: "no-store" });
  const json = (await res.json()) as { data: { token: string } };
  csrfToken = json.data.token;
  return csrfToken;
}

export async function apiFetch<T>(
  path: string,
  init: { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal } = {},
): Promise<T> {
  const method = init.method ?? "GET";
  const unsafe = !["GET", "HEAD"].includes(method);

  const send = async (forceCsrf: boolean) => {
    const headers: Record<string, string> = { accept: "application/json" };
    if (unsafe) headers["x-csrf-token"] = await ensureCsrf(forceCsrf);
    if (init.body !== undefined) headers["content-type"] = "application/json";
    return fetch(`/api/v1${path}`, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      signal: init.signal,
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    });
  };

  let res = await send(false);
  if (res.status === 403 && unsafe) {
    const peek = (await res.clone().json().catch(() => null)) as { error?: { code?: string } } | null;
    // The CSRF cookie may have expired; fetch a fresh token once and retry.
    if (peek?.error?.code === "csrf_failed") res = await send(true);
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as { error?: { code: string; message: string; details?: unknown } } | null;
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code ?? "error", json?.error?.message ?? res.statusText, json?.error?.details);
  }
  return json as T;
}

/** A non-sensitive hint cookie so anonymous readers never trigger a /me request. */
export function markSignedIn(on: boolean) {
  document.cookie = on
    ? "khoka_signed_in=1; path=/; max-age=1209600; samesite=lax"
    : "khoka_signed_in=; path=/; max-age=0; samesite=lax";
}
