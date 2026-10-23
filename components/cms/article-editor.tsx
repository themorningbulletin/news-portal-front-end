"use client";

/* eslint-disable @next/next/no-img-element -- CMS previews of arbitrary media URLs */
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/client-api";
import { paths } from "@/lib/urls";
import { formatWhen, fromLocalInput, staffName, toLocalInput, useApi, type CmsArticle, type CmsCategory, type CmsMedia, type CmsStaff, type CmsTag } from "./hooks";
import { MediaPicker } from "./media-picker";
import { RichText } from "./rich-text";
import { SeoPanel } from "./seo-panel";
import { btn, btnPrimary, ErrorNote, field, Panel, StatusBadge } from "./shell";

type Form = {
  title: string;
  slug: string;
  summary: string;
  body: string;
  format: CmsArticle["format"];
  category: string;
  tags: string[];
  authors: string[];
  featuredImage: string | null;
  imageAlt: string;
  imageCaption: string;
  imageCredit: string;
  videoUrl: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  focusKeyword: string;
  isFeatured: boolean;
  isEditorsPick: boolean;
  pinnedUntil: string;
  breakingUntil: string;
};

const toForm = (a: CmsArticle): Form => ({
  title: a.title,
  slug: a.slug,
  summary: a.summary ?? "",
  body: a.body ?? "",
  format: a.format,
  category: a.category ?? "",
  tags: a.tags ?? [],
  authors: a.authors ?? [],
  featuredImage: a.featuredImage ?? null,
  imageAlt: a.imageAlt ?? "",
  imageCaption: a.imageCaption ?? "",
  imageCredit: a.imageCredit ?? "",
  videoUrl: a.videoUrl ?? "",
  seoTitle: a.seo?.title ?? "",
  seoDescription: a.seo?.description ?? "",
  canonicalUrl: a.seo?.canonicalUrl ?? "",
  focusKeyword: a.seo?.focusKeyword ?? "",
  isFeatured: a.isFeatured,
  isEditorsPick: a.isEditorsPick,
  pinnedUntil: toLocalInput(a.pinnedUntil),
  breakingUntil: toLocalInput(a.breakingUntil),
});

function payload(f: Form, canCurate: boolean) {
  return {
    title: f.title,
    slug: f.slug,
    summary: f.summary,
    body: f.body,
    format: f.format,
    category: f.category || null,
    tags: f.tags,
    ...(f.authors.length ? { authors: f.authors } : {}),
    featuredImage: f.featuredImage,
    imageAlt: f.imageAlt,
    imageCaption: f.imageCaption,
    imageCredit: f.imageCredit,
    videoUrl: f.videoUrl,
    seo: { title: f.seoTitle, description: f.seoDescription, canonicalUrl: f.canonicalUrl, focusKeyword: f.focusKeyword },
    ...(canCurate
      ? {
          isFeatured: f.isFeatured,
          isEditorsPick: f.isEditorsPick,
          pinnedUntil: fromLocalInput(f.pinnedUntil),
          breakingUntil: fromLocalInput(f.breakingUntil),
        }
      : {}),
  };
}

const AUTOSAVE_MS = 4000;

export function ArticleEditor({ id }: { id: string }) {
  const t = useTranslations("cms");
  const uiLocale = useLocale() as "bn" | "en";
  const router = useRouter();
  const [article, setArticle] = useState<CmsArticle | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "autosaved" | "failed" | "conflict">("idle");
  const [error, setError] = useState<string | null>(null);
  const [markUpdated, setMarkUpdated] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadedImage, setImage] = useState<CmsMedia | null>(null);
  const [note, setNote] = useState("");
  const [showRevisions, setShowRevisions] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const saving = useRef(false);

  const cats = useApi<{ data: CmsCategory[] }>("/admin/categories");
  const staff = useApi<{ data: CmsStaff[] }>("/admin/users/staff");
  const tagSearch = useApi<{ data: CmsTag[] }>(`/admin/tags${tagQuery ? `?q=${encodeURIComponent(tagQuery)}` : ""}`);
  const allTags = useApi<{ data: CmsTag[] }>("/admin/tags");
  const [createdTags, setKnownTags] = useState<Map<string, CmsTag>>(new Map());
  const revisions = useApi<{ data: { id: string; version: number; reason: string; status: string; createdAt: string; createdBy?: { displayName?: string; email?: string } }[] }>(
    showRevisions ? `/admin/articles/${id}/revisions` : null,
  );

  const load = useCallback(async () => {
    const res = await apiFetch<{ data: CmsArticle }>(`/admin/articles/${id}`);
    setArticle(res.data);
    setForm(toForm(res.data));
    setDirty(false);
    setSaveState("idle");
    setError(null);
  }, [id]);

  useEffect(() => {
    let alive = true;
    apiFetch<{ data: CmsArticle }>(`/admin/articles/${id}`)
      .then((res) => {
        if (!alive) return;
        setArticle(res.data);
        setForm(toForm(res.data));
      })
      .catch((err) => alive && setError(err instanceof ApiError && err.status === 404 ? t("common.empty") : t("common.error")));
    return () => {
      alive = false;
    };
  }, [id, t]);

  // Labels for selected tags: the full tag list, current search results and tags created here.
  const tagLabels = useMemo(() => {
    const m = new Map(createdTags);
    for (const tg of allTags.data?.data ?? []) m.set(tg.id, tg);
    for (const tg of tagSearch.data?.data ?? []) m.set(tg.id, tg);
    return m;
  }, [createdTags, allTags.data, tagSearch.data]);

  // Current featured image details.
  const featuredId = form?.featuredImage ?? null;
  useEffect(() => {
    if (!featuredId || loadedImage?.id === featuredId) return;
    let alive = true;
    apiFetch<{ data: CmsMedia }>(`/admin/media/${featuredId}`)
      .then((r) => alive && setImage(r.data))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [featuredId, loadedImage?.id]);
  const image = featuredId && loadedImage?.id === featuredId ? loadedImage : null;

  const editable = Boolean(article?.permissions.canEdit);
  const canCurate = Boolean(article?.permissions.canCurate);

  const save = useCallback(
    async (mode: "manual" | "autosave") => {
      if (!article || !form || saving.current) return;
      saving.current = true;
      setSaveState("saving");
      try {
        const res = await apiFetch<{ data: CmsArticle }>(`/admin/articles/${article.id}`, {
          method: "PATCH",
          body: { ...payload(form, canCurate), version: article.version, revision: mode, ...(markUpdated ? { markUpdated: true } : {}) },
        });
        setArticle(res.data);
        // Keep what the user typed meanwhile; only adopt server-normalised slug and version.
        setForm((f) => (f ? { ...f, slug: res.data.slug } : f));
        setDirty(false);
        setMarkUpdated(false);
        setSaveState(mode === "manual" ? "saved" : "autosaved");
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) setSaveState("conflict");
        else {
          setSaveState("failed");
          setError(err instanceof ApiError && err.code === "validation_failed" ? `${t("common.saveFailed")}: ${JSON.stringify(err.details)}` : t("common.saveFailed"));
        }
      } finally {
        saving.current = false;
      }
    },
    [article, form, canCurate, markUpdated, t],
  );

  // Autosave drafts only. Published stories are saved explicitly, so nothing goes live by accident.
  useEffect(() => {
    if (!dirty || !editable || article?.status !== "draft" || saveState === "conflict") return;
    const timer = setTimeout(() => void save("autosave"), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [dirty, editable, article?.status, form, save, saveState]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const update = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setDirty(true);
    if (saveState === "saved" || saveState === "autosaved") setSaveState("idle");
  };

  const transition = async (action: string) => {
    if (!article) return;
    if (["publish", "unpublish", "archive"].includes(action) && !window.confirm(t(`confirm.${action}`))) return;
    if (dirty) await save("manual");
    setError(null);
    try {
      const current = await apiFetch<{ data: CmsArticle }>(`/admin/articles/${article.id}`);
      const res = await apiFetch<{ data: CmsArticle }>(`/admin/articles/${article.id}/transition`, {
        method: "POST",
        body: { action, version: current.data.version, ...(action === "schedule" ? { scheduledFor: fromLocalInput(scheduleAt) } : {}) },
      });
      setArticle(res.data);
      setForm(toForm(res.data));
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === "validation_failed") {
        const failed = (err.details as { checklist?: string[] } | undefined)?.checklist;
        setError(failed ? failed.map((c) => t(`editor.checks.${c}`)).join(" · ") : err.message);
      } else if (err instanceof ApiError && err.status === 409) setSaveState("conflict");
      else setError(t("common.error"));
    }
  };

  const categories = cats.data?.data ?? [];
  const staffList = staff.data?.data ?? [];
  const otherLocale = article?.locale === "bn" ? "en" : "bn";
  const translation = article?.translations.find((tr) => tr.locale === otherLocale);
  const statusText = useMemo(() => {
    if (saveState === "saving") return t("common.saving");
    if (saveState === "saved") return t("common.saved");
    if (saveState === "autosaved") return t("common.autosaved");
    if (saveState === "failed") return t("common.saveFailed");
    return dirty ? t("common.unsaved") : "";
  }, [saveState, dirty, t]);

  if (error && !article) return <ErrorNote message={error} />;
  if (!article || !form) return <div className="skeleton h-96" aria-hidden="true" />;

  const lang = article.locale;
  const blocking = article.checklist.filter((c) => c.blocking);
  const advisory = article.checklist.filter((c) => !c.blocking);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={article.status} />
          <span className="rounded bg-surface-2 px-2 py-0.5 text-xs font-semibold uppercase">{article.locale}</span>
          <span role="status" aria-live="polite" className="text-sm text-muted">
            {statusText}
          </span>
          {article.status === "published" && (
            <span className="text-sm text-muted">
              {t("tools.views7", { count: article.stats?.views7 ?? 0 })} · {t("tools.views30", { count: article.stats?.views30 ?? 0 })}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/${article.locale}/admin/preview/${article.id}`} target="_blank" rel="noopener" className={btn}>
            {t("editor.preview")}
          </a>
          {article.status === "published" && (
            <Link href={paths.article(article.locale, article.slug)} className={btn} target="_blank">
              {t("editor.viewLive")}
            </Link>
          )}
          <button
            type="button"
            className={btn}
            onClick={async () => {
              if (!window.confirm(t("tools.duplicateConfirm"))) return;
              try {
                const res = await apiFetch<{ data: CmsArticle }>(`/admin/articles/${article.id}/duplicate`, { method: "POST" });
                router.push(paths.admin(uiLocale, `articles/${res.data.id}`));
              } catch {
                setError(t("common.error"));
              }
            }}
          >
            {t("tools.duplicate")}
          </button>
          {editable && (
            <button type="button" className={btnPrimary} onClick={() => void save("manual")} disabled={saveState === "saving"}>
              {t("common.save")}
            </button>
          )}
        </div>
      </div>

      {saveState === "conflict" && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded border border-breaking/40 bg-breaking/10 p-3 text-sm">
          {t("common.conflict")}
          <button type="button" className={btn} onClick={() => void load()}>
            {t("common.reload")}
          </button>
        </div>
      )}
      <ErrorNote message={error} />
      {!editable && <p className="mb-4 rounded bg-surface-2 p-3 text-sm">{t("editor.readOnly")}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <label className="block text-sm font-semibold">
            {t("editor.headline")}
            <input lang={lang} value={form.title} onChange={(e) => update("title", e.target.value)} readOnly={!editable} maxLength={220} className={`${field} headline text-xl`} />
          </label>
          <label className="block text-sm font-semibold">
            {t("editor.summary")}
            <textarea lang={lang} value={form.summary} onChange={(e) => update("summary", e.target.value)} readOnly={!editable} maxLength={400} rows={3} className={`${field} py-2 font-normal`} aria-describedby="summary-hint" />
            <span id="summary-hint" className="mt-1 block text-xs font-normal text-muted">
              {t("editor.summaryHint")} ({form.summary.length}/400)
            </span>
          </label>
          <div>
            <p className="mb-1 text-sm font-semibold">{t("editor.body")}</p>
            <RichText value={form.body} onChange={(html) => update("body", html)} readOnly={!editable} label={t("editor.body")} lang={lang} />
          </div>

          <Panel title={t("editor.seo")}>
            <div className="grid gap-3">
              <label className="text-sm">
                {t("editor.slug")}
                <input lang={lang} value={form.slug} onChange={(e) => update("slug", e.target.value)} readOnly={!editable} className={field} aria-describedby="slug-hint" />
                <span id="slug-hint" className="mt-1 block text-xs text-muted">
                  {t("editor.slugHint")}
                </span>
              </label>
              <label className="text-sm">
                {t("editor.seoTitle")} ({form.seoTitle.length}/120)
                <input lang={lang} value={form.seoTitle} onChange={(e) => update("seoTitle", e.target.value)} readOnly={!editable} maxLength={120} className={field} />
              </label>
              <label className="text-sm">
                {t("editor.seoDescription")} ({form.seoDescription.length}/320)
                <textarea lang={lang} value={form.seoDescription} onChange={(e) => update("seoDescription", e.target.value)} readOnly={!editable} maxLength={320} rows={2} className={`${field} py-2`} />
              </label>
              <label className="text-sm">
                {t("editor.canonical")}
                <input type="url" value={form.canonicalUrl} onChange={(e) => update("canonicalUrl", e.target.value)} readOnly={!editable} className={field} />
              </label>
            </div>
          </Panel>

          <Panel title={t("seo.panel")}>
            <SeoPanel
              draft={{
                id: article.id,
                locale: article.locale,
                title: form.title,
                slug: form.slug,
                summary: form.summary,
                body: form.body,
                seo: { title: form.seoTitle, description: form.seoDescription, canonicalUrl: form.canonicalUrl, focusKeyword: form.focusKeyword },
                featuredImage: form.featuredImage,
                imageAlt: form.imageAlt,
                tags: form.tags,
                category: form.category || null,
              }}
              imageUrl={image?.url ?? null}
              focusKeyword={form.focusKeyword}
              onFocusKeyword={(v) => update("focusKeyword", v)}
              readOnly={!editable}
            />
          </Panel>

          <Panel title={t("editor.notes")}>
            <ul className="mb-3 space-y-2 text-sm">
              {article.editorialNotes.map((n) => (
                <li key={n._id} className="rounded bg-surface-2 p-2">
                  <p className="whitespace-pre-wrap">{n.text}</p>
                  <p className="mt-1 text-xs text-muted">{formatWhen(uiLocale, n.createdAt)}</p>
                </li>
              ))}
            </ul>
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim()) return;
                const res = await apiFetch<{ data: CmsArticle }>(`/admin/articles/${article.id}/notes`, { method: "POST", body: { text: note } });
                setArticle(res.data);
                setNote("");
              }}
            >
              <label className="sr-only" htmlFor="note">
                {t("editor.addNote")}
              </label>
              <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("editor.notePlaceholder")} className={`${field} mt-0`} maxLength={2000} />
              <button type="submit" className={btn}>
                {t("editor.addNote")}
              </button>
            </form>
          </Panel>

          <Panel
            title={t("editor.revisions")}
            actions={
              <button type="button" className={btn} onClick={() => setShowRevisions((v) => !v)} aria-expanded={showRevisions}>
                {showRevisions ? t("common.close") : t("editor.revisions")}
              </button>
            }
          >
            {showRevisions && (
              <ul className="divide-y divide-rule text-sm">
                {(revisions.data?.data ?? []).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      v{r.version} · {t(`editor.reasons.${r.reason}`)} · <StatusBadge status={r.status} /> · {formatWhen(uiLocale, r.createdAt)} · {r.createdBy?.displayName ?? r.createdBy?.email ?? ""}
                    </span>
                    {editable && (
                      <button
                        type="button"
                        className="text-link underline"
                        onClick={async () => {
                          if (!window.confirm(t("confirm.restoreRevision"))) return;
                          try {
                            const res = await apiFetch<{ data: CmsArticle }>(`/admin/articles/${article.id}/revisions/${r.id}/restore`, {
                              method: "POST",
                              body: { version: article.version },
                            });
                            setArticle(res.data);
                            setForm(toForm(res.data));
                            setDirty(false);
                            await revisions.reload();
                          } catch (err) {
                            if (err instanceof ApiError && err.status === 409) setSaveState("conflict");
                            else setError(t("common.error"));
                          }
                        }}
                      >
                        {t("editor.restore")}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title={t("editor.workflow")}>
            <div className="flex flex-col gap-2">
              {article.permissions.actions
                .filter((a) => a !== "schedule")
                .map((a) => (
                  <button key={a} type="button" className={a === "publish" ? btnPrimary : btn} onClick={() => void transition(a)}>
                    {t(`actions.${a}`)}
                  </button>
                ))}
              {article.permissions.actions.includes("schedule") && (
                <div className="mt-2 rounded border border-rule p-3">
                  <label className="text-sm">
                    {t("editor.scheduleAt")}
                    <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className={field} />
                  </label>
                  <button type="button" className={`${btn} mt-2 w-full`} disabled={!scheduleAt} onClick={() => void transition("schedule")}>
                    {t("actions.schedule")}
                  </button>
                </div>
              )}
              {article.status === "scheduled" && <p className="text-sm text-muted">{formatWhen(uiLocale, article.scheduledFor)}</p>}
              {article.status === "published" && editable && (
                <label className="mt-2 flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-5 w-5" checked={markUpdated} onChange={(e) => setMarkUpdated(e.target.checked)} />
                  {t("editor.markUpdated")}
                </label>
              )}
            </div>
          </Panel>

          <Panel title={t("editor.checklist")}>
            <ul className="space-y-1 text-sm">
              {[...blocking, ...advisory].map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <span aria-hidden="true" className={c.ok ? "text-brand" : c.blocking ? "text-breaking" : "text-accent"}>
                    {c.ok ? "✓" : c.blocking ? "✗" : "!"}
                  </span>
                  <span>
                    {t(`editor.checks.${c.id}`)}{" "}
                    <span className="text-xs text-muted">
                      ({c.blocking ? t("editor.required") : t("editor.recommended")}
                      {c.ok ? "" : " ✗"})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">{t("editor.factCheck")}</p>
          </Panel>

          <Panel title={t("editor.category")}>
            <div className="space-y-3">
              <label className="text-sm">
                {t("editor.category")}
                <select value={form.category} onChange={(e) => update("category", e.target.value)} disabled={!editable} className={field}>
                  <option value="">{t("editor.chooseCategory")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent ? "— " : ""}
                      {c.name[uiLocale]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                {t("editor.format")}
                <select value={form.format} onChange={(e) => update("format", e.target.value as Form["format"])} disabled={!editable} className={field}>
                  {(["standard", "explainer", "opinion", "photo", "video"] as const).map((f) => (
                    <option key={f} value={f}>
                      {t(`editor.formats.${f}`)}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="text-sm">{t("editor.tags")}</legend>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {form.tags.map((tid) => {
                    const tg = tagLabels.get(tid);
                    return (
                      <li key={tid} className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-xs">
                        {tg?.name[lang] ?? tg?.name.bn ?? tg?.name.en ?? tid.slice(-6)}
                        {editable && (
                          <button type="button" aria-label={`${t("common.delete")}: ${tg?.name[lang] ?? tid}`} onClick={() => update("tags", form.tags.filter((x) => x !== tid))}>
                            ×
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {editable && (
                  <div className="mt-2">
                    <label className="sr-only" htmlFor="tag-search">
                      {t("editor.addTag")}
                    </label>
                    <input id="tag-search" value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} placeholder={t("editor.addTag")} className={field} />
                    {tagQuery.trim().length > 0 && (
                      <ul className="mt-1 max-h-48 overflow-y-auto rounded border border-rule text-sm">
                        {(tagSearch.data?.data ?? [])
                          .filter((tg) => !form.tags.includes(tg.id))
                          .slice(0, 8)
                          .map((tg) => (
                            <li key={tg.id}>
                              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-surface-2" onClick={() => {
                                update("tags", [...form.tags, tg.id]);
                                setTagQuery("");
                              }}>
                                {tg.name[lang] ?? tg.name.bn ?? tg.name.en}
                              </button>
                            </li>
                          ))}
                        <li>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left font-semibold hover:bg-surface-2"
                            onClick={async () => {
                              try {
                                const res = await apiFetch<{ data: CmsTag }>("/admin/tags", { method: "POST", body: { name: { [lang]: tagQuery.trim() } } });
                                setKnownTags((m) => new Map(m).set(res.data.id, res.data));
                                update("tags", [...form.tags, res.data.id]);
                              } catch (err) {
                                const existing = err instanceof ApiError ? (err.details as { id?: string } | undefined)?.id : undefined;
                                if (existing && !form.tags.includes(existing)) update("tags", [...form.tags, existing]);
                              }
                              setTagQuery("");
                            }}
                          >
                            + {t("editor.newTag", { name: tagQuery.trim() })}
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                )}
              </fieldset>
              <fieldset>
                <legend className="text-sm">{t("editor.authors")}</legend>
                <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded border border-rule p-2">
                  {staffList.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        disabled={!editable}
                        checked={form.authors.includes(s.id)}
                        onChange={(e) => update("authors", e.target.checked ? [...form.authors, s.id] : form.authors.filter((a) => a !== s.id))}
                      />
                      {staffName(s, uiLocale)}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </Panel>

          <Panel title={t("editor.image")}>
            {image ? (
              <figure>
                <img src={image.url} alt={image.alt[lang] ?? ""} className="aspect-video w-full rounded object-cover" style={{ objectPosition: `${image.focalX}% ${image.focalY}%` }} />
                <figcaption className="mt-1 text-xs text-muted">{image.alt[lang] || t("media.missingAlt")}</figcaption>
              </figure>
            ) : null}
            {editable && (
              <div className="mt-2 flex gap-2">
                <button type="button" className={btn} onClick={() => setPickerOpen(true)}>
                  {t("editor.chooseImage")}
                </button>
                {form.featuredImage && (
                  <button type="button" className={btn} onClick={() => update("featuredImage", null)}>
                    {t("editor.removeImage")}
                  </button>
                )}
              </div>
            )}
            {form.featuredImage && (
              <div className="mt-3 space-y-2">
                <label className="block text-sm">
                  {t("editor.imageAlt")}
                  <input lang={lang} value={form.imageAlt} onChange={(e) => update("imageAlt", e.target.value)} readOnly={!editable} className={field} placeholder={image?.alt[lang] ?? ""} />
                </label>
                <label className="block text-sm">
                  {t("editor.imageCaption")}
                  <input lang={lang} value={form.imageCaption} onChange={(e) => update("imageCaption", e.target.value)} readOnly={!editable} className={field} placeholder={image?.caption[lang] ?? ""} />
                </label>
                <label className="block text-sm">
                  {t("editor.imageCredit")}
                  <input value={form.imageCredit} onChange={(e) => update("imageCredit", e.target.value)} readOnly={!editable} className={field} placeholder={image?.credit ?? ""} />
                </label>
              </div>
            )}
            <label className="mt-3 block text-sm">
              {t("editor.video")}
              <input type="url" value={form.videoUrl} onChange={(e) => update("videoUrl", e.target.value)} readOnly={!editable} className={field} placeholder="https://www.youtube.com/watch?v=…" />
            </label>
            <MediaPicker
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              onSelect={(m) => {
                setImage(m);
                update("featuredImage", m.id);
              }}
            />
          </Panel>

          {canCurate && (
            <Panel title={t("editor.curation")}>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" checked={form.isFeatured} disabled={!editable} onChange={(e) => update("isFeatured", e.target.checked)} />
                  {t("editor.featured")}
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" checked={form.isEditorsPick} disabled={!editable} onChange={(e) => update("isEditorsPick", e.target.checked)} />
                  {t("editor.editorsPick")}
                </label>
                <label className="block">
                  {t("editor.pinnedUntil")}
                  <input type="datetime-local" value={form.pinnedUntil} disabled={!editable} onChange={(e) => update("pinnedUntil", e.target.value)} className={field} />
                </label>
                <label className="block">
                  {t("editor.breakingUntil")}
                  <input type="datetime-local" value={form.breakingUntil} disabled={!editable} onChange={(e) => update("breakingUntil", e.target.value)} className={field} />
                </label>
              </div>
            </Panel>
          )}

          <Panel title={t("editor.translations")}>
            {translation ? (
              <Link href={paths.admin(uiLocale, `articles/${translation.id}`)} className="text-link underline" lang={translation.locale}>
                {t("editor.openTranslation", { lang: translation.locale === "bn" ? t("common.bangla") : t("common.english") })}: {translation.title}
              </Link>
            ) : (
              <Link href={`${paths.admin(uiLocale, "articles/new")}?translationOf=${article.id}&locale=${otherLocale}`} className={btn}>
                {t("editor.createTranslation", { lang: otherLocale === "bn" ? t("common.bangla") : t("common.english") })}
              </Link>
            )}
            <p className="mt-2 text-xs text-muted">{t("editor.translationNote")}</p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
