"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { formatWhen, useApi, type CmsCategory } from "@/components/cms/hooks";
import { btn, btnPrimary, can, ErrorNote, field, PageTitle, StatusBadge } from "@/components/cms/shell";
import { useAuth } from "@/components/providers";
import { apiFetch } from "@/lib/client-api";
import { paths } from "@/lib/urls";

interface Row {
  id: string;
  locale: "bn" | "en";
  status: string;
  title: string;
  updatedAt: string;
  views7?: number;
  category?: { name?: { bn?: string; en?: string } } | null;
  authors?: { displayName?: string; author?: { name?: { bn?: string; en?: string } } }[];
}

export default function ArticlesPage() {
  const t = useTranslations("cms");
  const locale = useLocale() as "bn" | "en";
  const { me } = useAuth();
  const [filters, setFilters] = useState({ status: "", locale: "", category: "", q: "", mine: false });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: "25" });
    for (const [k, v] of Object.entries(filters)) if (v) p.set(k, String(v));
    return `/admin/articles?${p}`;
  }, [filters, page]);
  const { data, error, loading, reload } = useApi<{ data: Row[]; meta: { totalPages: number; total: number } }>(query);
  const cats = useApi<{ data: CmsCategory[] }>("/admin/categories");

  const set = (k: keyof typeof filters, v: string | boolean) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
    setSelected(new Set());
  };
  const rows = data?.data ?? [];
  const bulkActions = can(me, "article:edit_any") ? ["submit", "unpublish", "archive"] : ["submit"];

  return (
    <div>
      <PageTitle
        actions={
          <Link href={paths.admin(locale, "articles/new")} className={btnPrimary}>
            + {t("nav.newArticle")}
          </Link>
        }
      >
        {t("nav.articles")}
      </PageTitle>

      <form className="mb-4 grid gap-3 rounded-lg border border-rule bg-surface p-4 sm:grid-cols-5" onSubmit={(e) => e.preventDefault()}>
        <label className="text-sm sm:col-span-2">
          {t("list.searchTitle")}
          <input type="search" className={field} value={filters.q} onChange={(e) => set("q", e.target.value)} />
        </label>
        <label className="text-sm">
          {t("list.filterStatus")}
          <select className={field} value={filters.status} onChange={(e) => set("status", e.target.value)}>
            <option value="">{t("common.all")}</option>
            {["draft", "in_review", "scheduled", "published", "archived"].map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          {t("list.filterLocale")}
          <select className={field} value={filters.locale} onChange={(e) => set("locale", e.target.value)}>
            <option value="">{t("common.all")}</option>
            <option value="bn">{t("common.bangla")}</option>
            <option value="en">{t("common.english")}</option>
          </select>
        </label>
        <label className="text-sm">
          {t("list.filterCategory")}
          <select className={field} value={filters.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">{t("common.all")}</option>
            {(cats.data?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name[locale]}
              </option>
            ))}
          </select>
        </label>
        {can(me, "article:edit_any") && (
          <label className="flex items-center gap-2 text-sm sm:col-span-5">
            <input type="checkbox" className="h-5 w-5" checked={filters.mine} onChange={(e) => set("mine", e.target.checked)} />
            {t("list.mine")}
          </label>
        )}
      </form>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded border border-rule bg-surface-2 p-3 text-sm">
          <span>{t("common.selected", { count: selected.size })}</span>
          <label className="sr-only" htmlFor="bulk">
            {t("list.bulkAction")}
          </label>
          <select id="bulk" className="min-h-11 rounded border border-rule-strong bg-paper px-2" value={bulk} onChange={(e) => setBulk(e.target.value)}>
            <option value="">{t("list.bulkAction")}</option>
            {bulkActions.map((a) => (
              <option key={a} value={a}>
                {t(`actions.${a}`)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={btn}
            disabled={!bulk}
            onClick={async () => {
              if (!window.confirm(t("confirm.bulk", { count: selected.size, action: t(`actions.${bulk}`) }))) return;
              const res = await apiFetch<{ data: { ok: boolean }[] }>("/admin/articles/bulk", {
                method: "POST",
                body: { ids: [...selected], action: bulk, confirm: true },
              });
              const ok = res.data.filter((r) => r.ok).length;
              setMessage(t("list.bulkResult", { ok, failed: res.data.length - ok }));
              setSelected(new Set());
              setBulk("");
              await reload();
            }}
          >
            {t("common.apply")}
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="mb-3 text-sm">
          {message}
        </p>
      )}
      <ErrorNote message={error ? t("common.error") : null} />

      {/* Phones: one card per story */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((r) => (
          <li key={r.id} className="flex items-start gap-3 rounded-lg border border-rule bg-surface p-3">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0"
              aria-label={t("list.selectRow", { title: r.title })}
              checked={selected.has(r.id)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(r.id);
                else next.delete(r.id);
                setSelected(next);
              }}
            />
            <div className="min-w-0 flex-1">
              <Link href={paths.admin(locale, `articles/${r.id}`)} className="font-semibold hover:underline" lang={r.locale}>
                {r.title}
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <StatusBadge status={r.status} />
                <span className="uppercase">{r.locale}</span>
                <span>{formatWhen(locale, r.updatedAt)}</span>
                {r.status === "published" && (
                  <span>
                    {t("tools.views")}: {r.views7 ?? 0}
                  </span>
                )}
              </p>
            </div>
          </li>
        ))}
        {!loading && rows.length === 0 && <li className="p-6 text-center text-muted">{t("common.empty")}</li>}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border border-rule bg-surface sm:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-rule text-left text-xs uppercase text-muted">
            <tr>
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  aria-label={t("list.selectAll")}
                  className="h-5 w-5"
                  checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                  onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                />
              </th>
              <th className="p-3">{t("list.title")}</th>
              <th className="p-3">{t("list.status")}</th>
              <th className="p-3">{t("list.filterCategory")}</th>
              <th className="p-3">{t("list.updated")}</th>
              <th className="p-3 text-right">{t("tools.views")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  {t("common.loading")}
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  {t("common.empty")}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface-2">
                <td className="p-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    aria-label={t("list.selectRow", { title: r.title })}
                    checked={selected.has(r.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(r.id);
                      else next.delete(r.id);
                      setSelected(next);
                    }}
                  />
                </td>
                <td className="p-3">
                  <Link href={paths.admin(locale, `articles/${r.id}`)} className="font-semibold hover:underline" lang={r.locale}>
                    {r.title}
                  </Link>
                  <span className="ml-2 rounded bg-surface-2 px-1.5 text-xs uppercase text-muted">{r.locale}</span>
                </td>
                <td className="p-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="p-3 text-ink-2">{r.category?.name?.[locale] ?? "—"}</td>
                <td className="whitespace-nowrap p-3 text-ink-2">{formatWhen(locale, r.updatedAt)}</td>
                <td className="p-3 text-right tabular-nums text-ink-2">{r.status === "published" ? (r.views7 ?? 0) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button type="button" className={btn} disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← {t("common.previous")}
          </button>
          <span className="text-sm text-muted">
            {page} / {data.meta.totalPages}
          </span>
          <button type="button" className={btn} disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>
            {t("common.next")} →
          </button>
        </div>
      )}
    </div>
  );
}
