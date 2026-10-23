"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createBrowserValue } from "@/lib/browser-store";
import { apiFetch, ApiError } from "@/lib/client-api";
import type { Locale } from "@/lib/config";
import { formatDate } from "@/lib/format";
import type { ArticleCard, PageMeta } from "@/lib/types";
import { paths } from "@/lib/urls";

const RECENT_KEY = "recentSearches";
const OPT_IN_KEY = "rememberSearches";

function loadRecent(): string[] {
  try {
    if (localStorage.getItem(OPT_IN_KEY) !== "1") return [];
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

const EMPTY: string[] = [];
const rememberStore = createBrowserValue(() => localStorage.getItem(OPT_IN_KEY) === "1", false);
const recentStore = createBrowserValue(loadRecent, EMPTY);

export function SearchApp({ categories, authors }: { categories: { slug: string; name: string }[]; authors: { slug: string; name: string }[] }) {
  const t = useTranslations("search");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const inputId = useId();
  const listId = useId();

  const q = sp.get("q") ?? "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const filters = { category: sp.get("category") ?? "", author: sp.get("author") ?? "", from: sp.get("from") ?? "", to: sp.get("to") ?? "" };

  const [draft, setDraft] = useState(q);
  const [draftFor, setDraftFor] = useState(q);
  if (draftFor !== q) {
    // The URL query changed (back/forward or a recent-search click): mirror it in the box.
    setDraftFor(q);
    setDraft(q);
  }
  const [suggested, setSuggested] = useState<{ term: string; items: { title: string; slug: string }[] }>({ term: "", items: [] });
  const [showSuggest, setShowSuggest] = useState(false);
  const remember = rememberStore.use();
  const recent = recentStore.use();
  const resultsRef = useRef<HTMLHeadingElement>(null);

  const term = draft.trim();
  const suggestions = term.length >= 2 && term !== q && suggested.term === term ? suggested.items : [];

  // Debounced headline suggestions while typing.
  useEffect(() => {
    if (term.length < 2 || term === q) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      apiFetch<{ data: { title: string; slug: string }[] }>(`/search/suggest?locale=${locale}&q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => setSuggested({ term, items: r.data }))
        .catch(() => undefined);
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term, q, locale]);

  // Results for the query in the URL.
  const searchKey = useMemo(() => {
    if (q.trim().length < 2) return null;
    const params = new URLSearchParams({ locale, q, page: String(page), limit: "20" });
    for (const k of ["category", "author", "from", "to"]) {
      const v = sp.get(k);
      if (v) params.set(k, v);
    }
    return params.toString();
  }, [q, page, locale, sp]);
  const [result, setResult] = useState<{ key: string; status: "done" | "error" | "limited"; items: ArticleCard[]; meta?: PageMeta } | null>(null);
  const state = searchKey === null ? { status: "idle" as const, items: [] as ArticleCard[], meta: undefined } : result?.key === searchKey ? result : { status: "loading" as const, items: [] as ArticleCard[], meta: undefined };

  useEffect(() => {
    if (!searchKey) return;
    const ctrl = new AbortController();
    apiFetch<{ data: ArticleCard[]; meta: PageMeta }>(`/search?${searchKey}`, { signal: ctrl.signal })
      .then((r) => {
        setResult({ key: searchKey, status: "done", items: r.data, meta: r.meta });
        resultsRef.current?.focus();
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setResult({ key: searchKey, status: err instanceof ApiError && err.status === 429 ? "limited" : "error", items: [] });
      });
    return () => ctrl.abort();
  }, [searchKey]);

  const go = (term: string, extra: Record<string, string> = filters, nextPage = 1) => {
    const params = new URLSearchParams();
    if (term) params.set("q", term);
    for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
    if (nextPage > 1) params.set("page", String(nextPage));
    router.push(`${pathname}?${params}`);
    setShowSuggest(false);
    if (remember && term) {
      const next = [term, ...recent.filter((r) => r !== term)].slice(0, 8);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage failures.
      }
      recentStore.notify();
    }
  };

  const field = "mt-1 min-h-11 w-full rounded border border-rule-strong bg-surface px-3";

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(draft.trim());
        }}
        className="relative"
      >
        <label htmlFor={inputId} className="text-sm font-semibold">
          {t("label")}
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id={inputId}
            type="search"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            onKeyDown={(e) => e.key === "Escape" && setShowSuggest(false)}
            placeholder={t("placeholder")}
            autoComplete="off"
            maxLength={100}
            role="combobox"
            aria-expanded={showSuggest && suggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            className="min-h-12 min-w-0 flex-1 rounded border border-rule-strong bg-surface px-3 text-lg"
          />
          <button type="submit" className="min-h-12 shrink-0 rounded bg-brand px-4 font-semibold text-brand-ink">
            {t("submit")}
          </button>
        </div>
        {showSuggest && suggestions.length > 0 && (
          <ul id={listId} role="listbox" aria-label={t("suggestions")} className="absolute inset-x-0 z-30 mt-1 rounded-md border border-rule bg-surface p-1 shadow-card">
            {suggestions.map((s) => (
              <li key={s.slug} role="option" aria-selected={false}>
                <Link href={paths.article(locale, s.slug)} className="block rounded px-3 py-2 hover:bg-surface-2">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4 rounded border border-rule bg-surface p-3" open={Boolean(filters.category || filters.author || filters.from || filters.to)}>
          <summary className="cursor-pointer font-semibold">{t("filters")}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <label className="text-sm">
              {t("category")}
              <select name="category" defaultValue={filters.category} className={field} onChange={(e) => go(q, { ...filters, category: e.target.value })}>
                <option value="">{t("any")}</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              {t("author")}
              <select name="author" defaultValue={filters.author} className={field} onChange={(e) => go(q, { ...filters, author: e.target.value })}>
                <option value="">{t("any")}</option>
                {authors.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              {t("from")}
              <input type="date" defaultValue={filters.from} className={field} onChange={(e) => go(q, { ...filters, from: e.target.value })} />
            </label>
            <label className="text-sm">
              {t("to")}
              <input type="date" defaultValue={filters.to} className={field} onChange={(e) => go(q, { ...filters, to: e.target.value })} />
            </label>
          </div>
        </details>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => {
                const on = e.target.checked;
                try {
                  if (on) localStorage.setItem(OPT_IN_KEY, "1");
                  else {
                    localStorage.removeItem(OPT_IN_KEY);
                    localStorage.removeItem(RECENT_KEY);
                  }
                } catch {
                  // Ignore storage failures.
                }
                rememberStore.notify();
                recentStore.notify();
              }}
              className="h-5 w-5"
            />
            {t("rememberSearches")}
          </label>
          {recent.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted">{t("recent")}:</span>
              {recent.map((r) => (
                <button key={r} type="button" className="rounded-full border border-rule-strong px-3 py-1 hover:bg-surface-2" onClick={() => go(r)}>
                  {r}
                </button>
              ))}
              <button
                type="button"
                className="text-link underline"
                onClick={() => {
                  try {
                    localStorage.removeItem(RECENT_KEY);
                  } catch {
                    // Ignore storage failures.
                  }
                  recentStore.notify();
                }}
              >
                {t("clearRecent")}
              </button>
            </div>
          )}
        </div>
      </form>

      <section aria-live="polite" className="mt-8">
        {q && q.trim().length < 2 && <p className="text-muted">{t("minChars")}</p>}
        {state.status === "loading" && <p className="text-muted">…</p>}
        {state.status === "error" && <p className="text-breaking">{t("error")}</p>}
        {state.status === "limited" && <p className="text-breaking">{t("rateLimited")}</p>}
        {state.status === "done" && (
          <>
            <h2 ref={resultsRef} tabIndex={-1} className="headline text-2xl outline-none">
              {t("resultsFor", { q })} <span className="text-base font-normal text-muted">({t("results", { count: state.meta?.total ?? 0 })})</span>
            </h2>
            {state.items.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-rule-strong p-6">
                <p className="font-semibold">{t("noResults", { q })}</p>
                <p className="mt-1 text-ink-2">{t("noResultsHint")}</p>
              </div>
            ) : (
              <ul className="mt-4">
                {state.items.map((a) => (
                  <li key={a.id} className="border-b border-rule py-4">
                    {a.category && <p className="kicker">{a.category.name}</p>}
                    <Link href={paths.article(locale, a.slug)} className="card-link">
                      <h3 className="headline text-xl">{a.title}</h3>
                    </Link>
                    <p className="mt-1 line-clamp-2 text-ink-2">{a.summary}</p>
                    {a.publishedAt && (
                      <p className="mt-1 text-sm text-muted">
                        <time dateTime={a.publishedAt}>{formatDate(locale, a.publishedAt, "medium")}</time>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {state.meta && state.meta.totalPages > 1 && (
              <div className="mt-6 flex justify-between">
                <button type="button" disabled={page <= 1} onClick={() => go(q, filters, page - 1)} className="min-h-11 rounded border border-rule-strong px-4 disabled:opacity-40">
                  ←
                </button>
                <button type="button" disabled={page >= state.meta.totalPages} onClick={() => go(q, filters, page + 1)} className="min-h-11 rounded border border-rule-strong px-4 disabled:opacity-40">
                  →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
