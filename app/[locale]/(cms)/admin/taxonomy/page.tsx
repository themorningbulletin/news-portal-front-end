"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useApi, type CmsCategory, type CmsTag } from "@/components/cms/hooks";
import { btn, btnPrimary, can, ErrorNote, field, PageTitle, Panel } from "@/components/cms/shell";
import { useAuth } from "@/components/providers";
import { apiFetch, ApiError } from "@/lib/client-api";

type Draft = { nameBn: string; nameEn: string; slugBn: string; slugEn: string; descBn: string; descEn: string; parent: string; order: number; isActive: boolean };
const empty: Draft = { nameBn: "", nameEn: "", slugBn: "", slugEn: "", descBn: "", descEn: "", parent: "", order: 0, isActive: true };
const fromCategory = (c: CmsCategory): Draft => ({
  nameBn: c.name.bn,
  nameEn: c.name.en,
  slugBn: c.slug.bn,
  slugEn: c.slug.en,
  descBn: c.description?.bn ?? "",
  descEn: c.description?.en ?? "",
  parent: c.parent ?? "",
  order: c.order,
  isActive: c.isActive,
});

function CategoryForm({ initial, id, categories, onDone, onClose }: { initial: Draft; id?: string; categories: CmsCategory[]; onDone: () => void; onClose: () => void }) {
  const t = useTranslations("cms");
  const [d, setD] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const input = (k: keyof Draft, label: string, lang?: string) => (
    <label className="text-sm">
      {label}
      <input lang={lang} value={String(d[k])} onChange={(e) => setD({ ...d, [k]: e.target.value })} className={field} required={k.startsWith("name") || k.startsWith("slug")} />
    </label>
  );
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await apiFetch(id ? `/admin/categories/${id}` : "/admin/categories", {
            method: id ? "PATCH" : "POST",
            body: {
              name: { bn: d.nameBn, en: d.nameEn },
              slug: { bn: d.slugBn, en: d.slugEn },
              description: { bn: d.descBn, en: d.descEn },
              parent: d.parent || null,
              order: Number(d.order) || 0,
              isActive: d.isActive,
            },
          });
          onDone();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : t("common.error"));
        }
      }}
    >
      {input("nameBn", t("taxonomy.nameBn"), "bn")}
      {input("nameEn", t("taxonomy.nameEn"), "en")}
      {input("slugBn", t("taxonomy.slugBn"), "bn")}
      {input("slugEn", t("taxonomy.slugEn"), "en")}
      {input("descBn", t("taxonomy.descriptionBn"), "bn")}
      {input("descEn", t("taxonomy.descriptionEn"), "en")}
      <label className="text-sm">
        {t("taxonomy.parent")}
        <select value={d.parent} onChange={(e) => setD({ ...d, parent: e.target.value })} className={field}>
          <option value="">{t("common.none")}</option>
          {categories
            .filter((c) => !c.parent && c.id !== id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.bn} / {c.name.en}
              </option>
            ))}
        </select>
      </label>
      <label className="text-sm">
        {t("taxonomy.order")}
        <input type="number" min={0} max={1000} value={d.order} onChange={(e) => setD({ ...d, order: Number(e.target.value) })} className={field} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} />
        {t("taxonomy.active")}
      </label>
      <div className="sm:col-span-2">
        <ErrorNote message={error} />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="submit" className={btnPrimary}>
            {t("common.save")}
          </button>
          <button type="button" className={btn} onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function TaxonomyPage() {
  const t = useTranslations("cms");
  const locale = useLocale() as "bn" | "en";
  const { me } = useAuth();
  const manage = can(me, "taxonomy:manage");
  const cats = useApi<{ data: CmsCategory[] }>("/admin/categories");
  const [tagQ, setTagQ] = useState("");
  const [newTag, setNewTag] = useState({ bn: "", en: "" });
  const [editTag, setEditTag] = useState<{ id: string; bn: string; en: string } | null>(null);
  const tags = useApi<{ data: CmsTag[] }>(`/admin/tags${tagQ ? `?q=${encodeURIComponent(tagQ)}` : ""}`);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const categories = cats.data?.data ?? [];

  return (
    <div className="space-y-8">
      <PageTitle>{t("nav.taxonomy")}</PageTitle>
      <Panel
        title={t("taxonomy.categories")}
        actions={
          manage && (
            <button type="button" className={btn} onClick={() => setEditing("new")}>
              + {t("taxonomy.add")}
            </button>
          )
        }
      >
        {editing === "new" && (
          <div className="mb-4 rounded border border-rule p-3">
            <CategoryForm initial={empty} categories={categories} onDone={() => { setEditing(null); void cats.reload(); }} onClose={() => setEditing(null)} />
          </div>
        )}
        <ul className="divide-y divide-rule">
          {categories.map((c) => (
            <li key={c.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={c.parent ? "pl-5" : "font-semibold"}>
                  {c.name[locale]} <span className="text-xs text-muted">/{c.slug[locale]}</span>
                  {!c.isActive && <span className="ml-2 text-xs text-breaking">({t("taxonomy.active")}: {t("common.no")})</span>}
                </span>
                <span className="flex items-center gap-3 text-sm text-muted">
                  {c.articleCount} {t("taxonomy.stories")}
                  {manage && (
                    <button type="button" className="text-link underline" aria-expanded={editing === c.id} onClick={() => setEditing(editing === c.id ? null : c.id)}>
                      {editing === c.id ? t("common.close") : t("common.edit")}
                    </button>
                  )}
                </span>
              </div>
              {editing === c.id && (
                <div className="mt-3 rounded border border-rule p-3">
                  <CategoryForm initial={fromCategory(c)} id={c.id} categories={categories} onDone={() => { setEditing(null); void cats.reload(); }} onClose={() => setEditing(null)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={t("taxonomy.tags")}>
        <label className="block max-w-sm text-sm">
          {t("common.search")}
          <input type="search" value={tagQ} onChange={(e) => setTagQ(e.target.value)} className={field} />
        </label>
        <details className="mt-3 rounded border border-rule bg-paper p-3 text-sm" open>
          <summary className="cursor-pointer font-semibold">{t("taxonomy.howTitle")}</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
            <li>{t("taxonomy.how1")}</li>
            <li>{t("taxonomy.how2")}</li>
            <li>{t("taxonomy.how3")}</li>
            <li>{t("taxonomy.how4")}</li>
            <li>{t("taxonomy.how5")}</li>
          </ol>
        </details>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            setTagError(null);
            const name = { ...(newTag.bn.trim() ? { bn: newTag.bn.trim() } : {}), ...(newTag.en.trim() ? { en: newTag.en.trim() } : {}) };
            try {
              await apiFetch("/admin/tags", { method: "POST", body: { name } });
              setNewTag({ bn: "", en: "" });
              await tags.reload();
            } catch (err) {
              setTagError(err instanceof ApiError && err.status === 409 ? t("taxonomy.tagExists") : err instanceof ApiError ? err.message : t("common.error"));
            }
          }}
        >
          <label className="min-w-0 text-sm">
            {t("taxonomy.tagNameBn")}
            <input lang="bn" value={newTag.bn} maxLength={60} onChange={(e) => setNewTag({ ...newTag, bn: e.target.value })} className={field} placeholder="যেমন: বর্ষা" />
          </label>
          <label className="min-w-0 text-sm">
            {t("taxonomy.tagNameEn")}
            <input lang="en" value={newTag.en} maxLength={60} onChange={(e) => setNewTag({ ...newTag, en: e.target.value })} className={field} placeholder="e.g. Monsoon" />
          </label>
          <button type="submit" className={`${btnPrimary} shrink-0`} disabled={!newTag.bn.trim() && !newTag.en.trim()}>
            + {t("taxonomy.addTag")}
          </button>
        </form>
        <ErrorNote message={tagError} />
        {(tags.data?.data ?? []).some((tg) => !tg.name.bn || !tg.name.en) && <p className="mt-3 text-xs text-muted">{t("taxonomy.missingHint")}</p>}
        {editTag && (
          <form
            className="mt-3 grid gap-2 rounded border border-rule p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              setTagError(null);
              try {
                await apiFetch(`/admin/tags/${editTag.id}`, { method: "PATCH", body: { name: { bn: editTag.bn.trim(), en: editTag.en.trim() } } });
                setEditTag(null);
                await tags.reload();
              } catch (err) {
                setTagError(err instanceof ApiError && err.status === 409 ? t("taxonomy.tagExists") : err instanceof ApiError ? err.message : t("common.error"));
              }
            }}
          >
            <label className="min-w-0 text-sm">
              {t("taxonomy.tagNameBn")}
              <input lang="bn" value={editTag.bn} maxLength={60} onChange={(e) => setEditTag({ ...editTag, bn: e.target.value })} className={field} />
            </label>
            <label className="min-w-0 text-sm">
              {t("taxonomy.tagNameEn")}
              <input lang="en" value={editTag.en} maxLength={60} onChange={(e) => setEditTag({ ...editTag, en: e.target.value })} className={field} />
            </label>
            <button type="submit" className={btnPrimary}>
              {t("common.save")}
            </button>
            <button type="button" className={btn} onClick={() => setEditTag(null)}>
              {t("common.close")}
            </button>
          </form>
        )}
        <ul className="mt-3 flex flex-wrap gap-2">
          {(tags.data?.data ?? []).map((tg) => (
            <li key={tg.id} className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${!tg.name.bn || !tg.name.en ? "border-dashed border-breaking" : "border-rule-strong"}`}>
              {manage ? (
                <button type="button" className="hover:underline" title={t("taxonomy.editTag")} onClick={() => setEditTag({ id: tg.id, bn: tg.name.bn ?? "", en: tg.name.en ?? "" })}>
                  <span lang="bn">{tg.name.bn ?? "—"}</span> / <span lang="en">{tg.name.en ?? "—"}</span>
                </button>
              ) : (
                <span>
                  <span lang="bn">{tg.name.bn ?? "—"}</span> / <span lang="en">{tg.name.en ?? "—"}</span>
                </span>
              )}
              {manage && (
                <button
                  type="button"
                  aria-label={`${t("taxonomy.deleteTag")}: ${tg.name[locale] ?? ""}`}
                  className="text-breaking"
                  onClick={async () => {
                    setTagError(null);
                    try {
                      await apiFetch(`/admin/tags/${tg.id}`, { method: "DELETE" });
                      await tags.reload();
                    } catch (err) {
                      setTagError(err instanceof ApiError && err.status === 409 ? t("taxonomy.inUse") : t("common.error"));
                    }
                  }}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
