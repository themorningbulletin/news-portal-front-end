"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers";
import { applyTheme } from "@/components/site/header-controls";
import { apiFetch, ApiError, markSignedIn } from "@/lib/client-api";
import type { Locale } from "@/lib/config";
import { formatDate } from "@/lib/format";
import type { ArticleCard } from "@/lib/types";
import { paths } from "@/lib/urls";

const box = "mt-8 rounded-lg border border-rule bg-surface p-5 sm:p-6";
const btn = "inline-flex min-h-11 items-center rounded border border-rule-strong px-4 text-sm font-semibold hover:bg-surface-2 disabled:opacity-50";

function StoryList({ locale, items, onRemove, removeLabel }: { locale: Locale; items: ArticleCard[]; onRemove?: (a: ArticleCard) => void; removeLabel?: string }) {
  return (
    <ul className="divide-y divide-rule">
      {items.map((a) => (
        <li key={a.id} className="flex items-start justify-between gap-4 py-3">
          <div>
            <Link href={paths.article(a.locale, a.slug)} className="font-semibold hover:underline" lang={a.locale}>
              {a.title}
            </Link>
            {a.publishedAt && (
              <p className="text-xs text-muted">
                <time dateTime={a.publishedAt}>{formatDate(locale, a.publishedAt, "medium")}</time>
              </p>
            )}
          </div>
          {onRemove && (
            <button type="button" className="shrink-0 text-sm text-link underline" onClick={() => onRemove(a)}>
              {removeLabel}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AccountPanel({ categories }: { categories: { id: string; name: string; parentId: string | null }[] }) {
  const t = useTranslations("account");
  const themeT = useTranslations("theme");
  const article = useTranslations("article");
  const nav = useTranslations("nav");
  const locale = useLocale() as Locale;
  const { me, status, setMe } = useAuth();
  const [bookmarks, setBookmarks] = useState<ArticleCard[] | null>(null);
  const [feed, setFeed] = useState<ArticleCard[] | null>(null);
  const [followsDraft, setFollows] = useState<Set<string> | null>(null);
  const follows = followsDraft ?? new Set(me?.followedCategories ?? []);
  const [saving, setSaving] = useState<"" | "follows" | "prefs">("");
  const [savedMsg, setSavedMsg] = useState("");
  const [confirm, setConfirm] = useState("");
  const [deleteState, setDeleteState] = useState<"idle" | "busy" | "done" | "staff" | "error">("idle");

  const fetchLists = useCallback(
    () =>
      Promise.all([
        apiFetch<{ data: ArticleCard[] }>(`/me/bookmarks?locale=${locale}&limit=50`),
        apiFetch<{ data: ArticleCard[] }>(`/me/feed?locale=${locale}&limit=10`),
      ]),
    [locale],
  );
  const load = useCallback(async () => {
    const [b, f] = await fetchLists();
    setBookmarks(b.data);
    setFeed(f.data);
  }, [fetchLists]);

  const signedIn = status === "signed-in";
  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    fetchLists()
      .then(([b, f]) => {
        if (!alive) return;
        setBookmarks(b.data);
        setFeed(f.data);
      })
      .catch(() => {
        if (!alive) return;
        setBookmarks([]);
        setFeed([]);
      });
    return () => {
      alive = false;
    };
  }, [signedIn, fetchLists]);

  if (deleteState === "done") return <p role="status" className="mt-6 rounded bg-brand-soft p-4">{t("deleted")}</p>;
  if (status === "loading") return <div className="skeleton mt-8 h-40" aria-hidden="true" />;
  if (status === "anonymous" || !me) {
    return (
      <div className="mt-6">
        <p>{t("needsSignIn")}</p>
        <Link href={paths.login(locale, paths.account(locale))} className="mt-4 inline-flex min-h-11 items-center rounded bg-brand px-5 font-semibold text-brand-ink">
          {nav("signIn")}
        </Link>
      </div>
    );
  }

  const flash = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(""), 3000);
  };

  return (
    <div>
      <p className="mt-2 text-ink-2">{t("signedInAs", { email: me.email ?? "" })}</p>
      <p role="status" className="sr-only">
        {savedMsg}
      </p>

      <section className={box} aria-labelledby="bookmarks">
        <h2 id="bookmarks" className="headline text-2xl">
          {t("bookmarks")}
        </h2>
        {bookmarks === null ? (
          <div className="skeleton mt-4 h-20" aria-hidden="true" />
        ) : bookmarks.length === 0 ? (
          <p className="mt-3 text-ink-2">{t("noBookmarks")}</p>
        ) : (
          <StoryList
            locale={locale}
            items={bookmarks}
            removeLabel={t("remove")}
            onRemove={async (a) => {
              await apiFetch(`/me/bookmarks/${a.translationGroup}`, { method: "DELETE" });
              setBookmarks((list) => list?.filter((x) => x.translationGroup !== a.translationGroup) ?? null);
            }}
          />
        )}
      </section>

      <section className={box} aria-labelledby="follows">
        <h2 id="follows" className="headline text-2xl">
          {t("follows")}
        </h2>
        <p className="mt-1 text-sm text-ink-2">{t("followHint")}</p>
        <fieldset className="mt-4">
          <legend className="sr-only">{t("follows")}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {categories.map((c) => (
              <label key={c.id} className={`flex min-h-11 items-center gap-2 rounded border border-rule px-3 ${c.parentId ? "sm:ml-4" : ""}`}>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={follows.has(c.id)}
                  onChange={(e) => {
                    const next = new Set(follows);
                    if (e.target.checked) next.add(c.id);
                    else next.delete(c.id);
                    setFollows(next);
                  }}
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          className={`${btn} mt-4`}
          disabled={saving === "follows"}
          onClick={async () => {
            setSaving("follows");
            try {
              const res = await apiFetch<{ data: typeof me }>("/me/follows", { method: "PUT", body: { categories: [...follows], tags: me.followedTags } });
              setMe(res.data);
              setFollows(null);
              await load();
              flash(t("saved"));
            } finally {
              setSaving("");
            }
          }}
        >
          {t("saveFollows")}
        </button>
        {savedMsg && <span className="ml-3 text-sm text-brand">{savedMsg}</span>}

        <h3 className="headline mt-8 text-xl">{t("feed")}</h3>
        {feed === null ? (
          <div className="skeleton mt-4 h-20" aria-hidden="true" />
        ) : feed.length === 0 ? (
          <p className="mt-2 text-ink-2">{t("noFeed")}</p>
        ) : (
          <StoryList locale={locale} items={feed} />
        )}
      </section>

      <section className={box} aria-labelledby="prefs">
        <h2 id="prefs" className="headline text-2xl">
          {t("preferences")}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            {themeT("label")}
            <select
              defaultValue={me.preferences.theme}
              className="mt-1 min-h-11 w-full rounded border border-rule-strong bg-paper px-3 font-normal"
              onChange={async (e) => {
                const theme = e.target.value as "system" | "light" | "dark";
                applyTheme(theme);
                const res = await apiFetch<{ data: typeof me }>("/me/preferences", { method: "PATCH", body: { theme } });
                setMe(res.data);
                flash(t("saved"));
              }}
            >
              <option value="system">{themeT("system")}</option>
              <option value="light">{themeT("light")}</option>
              <option value="dark">{themeT("dark")}</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            {article("textSize")}
            <select
              defaultValue={me.preferences.textSize}
              className="mt-1 min-h-11 w-full rounded border border-rule-strong bg-paper px-3 font-normal"
              onChange={async (e) => {
                const textSize = e.target.value as "sm" | "md" | "lg" | "xl";
                document.documentElement.setAttribute("data-text-size", textSize);
                try {
                  localStorage.setItem("textSize", textSize);
                } catch {
                  // Server copy is still saved.
                }
                const res = await apiFetch<{ data: typeof me }>("/me/preferences", { method: "PATCH", body: { textSize } });
                setMe(res.data);
                flash(t("saved"));
              }}
            >
              <option value="sm">A−</option>
              <option value="md">A</option>
              <option value="lg">A+</option>
              <option value="xl">A++</option>
            </select>
          </label>
        </div>
      </section>

      <section className={box} aria-labelledby="privacy">
        <h2 id="privacy" className="headline text-2xl">
          {t("privacy")}
        </h2>
        <p className="mt-2 text-ink-2">{t("privacyIntro")}</p>
        <a href="/api/v1/me/export" className={`${btn} mt-4`} download>
          {t("export")}
        </a>
        <div className="mt-8 border-t border-rule pt-6">
          <h3 className="font-semibold text-breaking">{t("delete")}</h3>
          <p className="mt-1 text-sm text-ink-2">{t("deleteHint")}</p>
          <label className="mt-3 block text-sm">
            {t("deleteConfirm")}
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 min-h-11 w-full max-w-xs rounded border border-rule-strong bg-paper px-3" autoComplete="off" />
          </label>
          <button
            type="button"
            disabled={confirm !== "DELETE" || deleteState === "busy"}
            className="mt-3 min-h-11 rounded bg-breaking px-4 text-sm font-semibold text-breaking-ink disabled:opacity-40"
            onClick={async () => {
              setDeleteState("busy");
              try {
                await apiFetch("/me", { method: "DELETE", body: { confirm: "DELETE" } });
                markSignedIn(false);
                setMe(null);
                setDeleteState("done");
              } catch (err) {
                setDeleteState(err instanceof ApiError && err.status === 403 ? "staff" : "error");
              }
            }}
          >
            {t("delete")}
          </button>
          {deleteState === "staff" && <p role="alert" className="mt-2 text-sm text-breaking">{t("staffNote")}</p>}
        </div>
      </section>
    </div>
  );
}
