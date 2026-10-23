import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["bn", "en"];
const DEFAULT = "bn";
export const LOCALE_COOKIE = "NEXT_LOCALE";
const SESSION_COOKIES = ["__Host-khoka_session", "khoka_session"];

/** Picks bn or en from Accept-Language, honouring q-values. */
export function negotiate(header: string | null): string {
  if (!header) return DEFAULT;
  const ranked = header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { lang: (tag ?? "").split("-")[0], q: Number.isFinite(q) ? q : 0, i };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  return ranked.find((x) => LOCALES.includes(x.lang ?? ""))?.lang ?? DEFAULT;
}

/**
 * Newsroom areas and the permission each needs. The API enforces the same
 * permissions on every request; this check stops the screens from being served
 * at all to people who may not use them.
 */
const ADMIN_AREAS: [RegExp, string][] = [
  [/^\/admin\/users(\/|$)/, "users:manage"],
  [/^\/admin\/audit(\/|$)/, "audit:read"],
  [/^\/admin\/ads(\/|$)/, "ads:manage"],
  [/^\/admin\/homepage(\/|$)/, "homepage:manage"],
  [/^\/admin\/pages(\/|$)/, "pages:manage"],
  [/^\/admin\/seo(\/|$)/, "article:edit_any"],
  [/^\/admin\/(articles|media|taxonomy|calendar|profile|preview)(\/|$)/, "article:create"],
  [/^\/admin\/?$/, "*staff"],
  [/^\/preview-frame(\/|$)/, "article:create"],
];

export function requiredPermission(pathWithoutLocale: string): string | null {
  for (const [re, perm] of ADMIN_AREAS) if (re.test(pathWithoutLocale)) return perm;
  return pathWithoutLocale.startsWith("/admin") ? "*staff" : null;
}

const STAFF_PERMISSIONS = ["dashboard:read", "ads:manage"];

async function permissionsFor(request: NextRequest): Promise<string[] | null> {
  const api = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/$/, "");
  try {
    const res = await fetch(`${api}/api/v1/auth/me`, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        accept: "application/json",
        // Identifies the site's own server so these checks do not share one per-IP rate limit.
        ...(process.env.INTERNAL_API_KEY ? { "x-internal-key": process.env.INTERNAL_API_KEY } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { permissions?: string[] } };
    return json.data?.permissions ?? [];
  } catch {
    return null;
  }
}

async function guardNewsroom(request: NextRequest, locale: string, rest: string): Promise<NextResponse> {
  const perm = requiredPermission(rest)!;
  const loginUrl = new URL(`/${locale}/login`, request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);

  const hasSession = SESSION_COOKIES.some((c) => request.cookies.get(c)?.value);
  if (!hasSession) return NextResponse.redirect(loginUrl, 307);

  const permissions = await permissionsFor(request);
  if (permissions === null) return NextResponse.redirect(loginUrl, 307);

  const allowed = perm === "*staff" ? STAFF_PERMISSIONS.some((p) => permissions.includes(p)) : permissions.includes(perm);
  if (!allowed) {
    const res = NextResponse.rewrite(new URL(`/${locale}/no-access`, request.url), { status: 403 });
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  }
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

/**
 * 1. Unprefixed URLs are redirected to a language edition (e.g. "/" -> "/bn").
 *    Locale-prefixed public pages are never redirected, so readers and crawlers
 *    can always open both editions; an explicit language choice is remembered.
 * 2. Newsroom URLs (/xx/admin/..., /xx/preview-frame/...) require a valid
 *    session with the right permission before anything is rendered.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (LOCALES.includes(first)) {
    const rest = pathname.slice(first.length + 1) || "/";
    if (rest.startsWith("/admin") || rest.startsWith("/preview-frame")) return guardNewsroom(request, first, rest);
    return NextResponse.next();
  }

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = cookie && LOCALES.includes(cookie) ? cookie : negotiate(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  const res = NextResponse.redirect(url, 307);
  res.headers.set("Vary", "Accept-Language, Cookie");
  return res;
}

export const config = {
  matcher: [
    // Everything except Next internals, the API proxy, and files with an extension (robots.txt, sitemaps, images...).
    "/((?!_next/|api/|sitemaps/|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
