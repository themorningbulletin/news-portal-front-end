"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { formatWhen, useApi } from "@/components/cms/hooks";
import { RichText } from "@/components/cms/rich-text";
import { btn, btnPrimary, ErrorNote, field, PageTitle, Panel } from "@/components/cms/shell";
import { apiFetch, ApiError } from "@/lib/client-api";

const KEYS = ["about", "contact", "editorial-policy", "corrections", "privacy", "terms"] as const;
interface PageDoc {
  key: string;
  locale: "bn" | "en";
  title: string;
  body: string;
  status: "draft" | "published";
  updatedAt?: string;
}

function PageEditor({ pageKey, locale, onSaved }: { pageKey: string; locale: "bn" | "en"; onSaved: () => void }) {
  const t = useTranslations("cms");
  const { data } = useApi<{ data: PageDoc }>(`/admin/pages/${pageKey}/${locale}`);
  const [edited, setDoc] = useState<PageDoc | null>(null);
  const doc = edited ?? data?.data ?? null;
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  if (!doc) return <div className="skeleton h-48" aria-hidden="true" />;
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setSaved(false);
        try {
          await apiFetch(`/admin/pages/${pageKey}/${locale}`, { method: "PUT", body: { title: doc.title, body: doc.body, status: doc.status } });
          setSaved(true);
          onSaved();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : t("common.error"));
        }
      }}
    >
      <label className="block text-sm">
        {t("pages.title")}
        <input lang={locale} required value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} className={field} maxLength={160} />
      </label>
      <div>
        <p className="mb-1 text-sm">{t("pages.body")}</p>
        <RichText value={doc.body} onChange={(body) => setDoc({ ...doc, body })} label={t("pages.body")} lang={locale} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={doc.status === "published"} onChange={(e) => setDoc({ ...doc, status: e.target.checked ? "published" : "draft" })} />
        {t("pages.published")}
      </label>
      <ErrorNote message={error} />
      <div className="flex items-center gap-3">
        <button type="submit" className={btnPrimary}>
          {t("common.save")}
        </button>
        <span role="status" className="text-sm text-muted">
          {saved ? t("common.saved") : ""}
        </span>
      </div>
    </form>
  );
}

export default function InfoPagesAdmin() {
  const t = useTranslations("cms");
  const footer = useTranslations("footer.pages");
  const uiLocale = useLocale();
  const list = useApi<{ data: PageDoc[] }>("/admin/pages");
  const [open, setOpen] = useState<{ key: string; locale: "bn" | "en" } | null>(null);
  const find = (key: string, locale: string) => list.data?.data.find((p) => p.key === key && p.locale === locale);

  return (
    <div>
      <PageTitle>{t("nav.pages")}</PageTitle>
      <p className="mb-4 max-w-3xl text-sm text-ink-2">{t("pages.intro")}</p>
      <div className="space-y-3">
        {KEYS.map((key) => (
          <Panel key={key} title={footer(key)}>
            <div className="flex flex-wrap gap-3">
              {(["bn", "en"] as const).map((l) => {
                const p = find(key, l);
                return (
                  <button key={l} type="button" className={btn} aria-expanded={open?.key === key && open.locale === l} onClick={() => setOpen(open?.key === key && open.locale === l ? null : { key, locale: l })}>
                    {l === "bn" ? t("common.bangla") : t("common.english")}:{" "}
                    {p ? (p.status === "published" ? t("pages.published") : t("status.draft")) : t("pages.notCreated")}
                    {p?.updatedAt ? ` · ${formatWhen(uiLocale, p.updatedAt)}` : ""}
                  </button>
                );
              })}
            </div>
            {open?.key === key && (
              <div className="mt-4">
                <PageEditor key={`${key}-${open.locale}`} pageKey={key} locale={open.locale} onSaved={() => void list.reload()} />
              </div>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
