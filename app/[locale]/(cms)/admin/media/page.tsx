"use client";

/* eslint-disable @next/next/no-img-element -- CMS thumbnails of arbitrary media URLs */
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useApi, type CmsMedia } from "@/components/cms/hooks";
import { btn, btnPrimary, ErrorNote, field, PageTitle, Panel } from "@/components/cms/shell";
import { apiFetch, ApiError } from "@/lib/client-api";

function MediaEditor({ media, onSaved }: { media: CmsMedia; onSaved: (m: CmsMedia) => void }) {
  const t = useTranslations("cms");
  const [m, setM] = useState(media);
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");
  return (
    <form
      className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("saving");
        try {
          const res = await apiFetch<{ data: CmsMedia }>(`/admin/media/${m.id}`, {
            method: "PATCH",
            body: { alt: { bn: m.alt.bn ?? "", en: m.alt.en ?? "" }, caption: { bn: m.caption.bn ?? "", en: m.caption.en ?? "" }, credit: m.credit ?? "", focalX: m.focalX, focalY: m.focalY },
          });
          onSaved(res.data);
          setState("saved");
        } catch {
          setState("error");
        }
      }}
    >
      <div>
        <p className="text-sm font-semibold">{t("media.focal")}</p>
        <p className="mb-2 text-xs text-muted">{t("media.focalHint")}</p>
        <button
          type="button"
          className="relative block w-full overflow-hidden rounded"
          aria-label={`${t("media.focal")}: ${Math.round(m.focalX)}%, ${Math.round(m.focalY)}%`}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setM({ ...m, focalX: Math.round(((e.clientX - r.left) / r.width) * 100), focalY: Math.round(((e.clientY - r.top) / r.height) * 100) });
          }}
          onKeyDown={(e) => {
            const step = 5;
            const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            const d = move[e.key];
            if (!d) return;
            e.preventDefault();
            setM({ ...m, focalX: Math.min(100, Math.max(0, m.focalX + d[0])), focalY: Math.min(100, Math.max(0, m.focalY + d[1])) });
          }}
        >
          <img src={m.url} alt={m.alt.en ?? m.alt.bn ?? ""} className="w-full" />
          <span className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow" style={{ left: `${m.focalX}%`, top: `${m.focalY}%` }} />
        </button>
      </div>
      <div className="space-y-2">
        {(["bn", "en"] as const).map((l) => (
          <div key={l} className="space-y-2">
            <label className="block text-sm">
              {t(l === "bn" ? "media.altBn" : "media.altEn")}
              <input lang={l} value={m.alt[l] ?? ""} onChange={(e) => setM({ ...m, alt: { ...m.alt, [l]: e.target.value } })} className={field} maxLength={300} />
            </label>
            <label className="block text-sm">
              {t(l === "bn" ? "media.captionBn" : "media.captionEn")}
              <input lang={l} value={m.caption[l] ?? ""} onChange={(e) => setM({ ...m, caption: { ...m.caption, [l]: e.target.value } })} className={field} maxLength={500} />
            </label>
          </div>
        ))}
        <label className="block text-sm">
          {t("media.credit")}
          <input value={m.credit ?? ""} onChange={(e) => setM({ ...m, credit: e.target.value })} className={field} maxLength={200} />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className={btnPrimary} disabled={state === "saving"}>
            {t("common.save")}
          </button>
          <span role="status" className="text-sm text-muted">
            {state === "saved" ? t("common.saved") : state === "error" ? t("common.saveFailed") : ""}
          </span>
        </div>
      </div>
    </form>
  );
}

export default function MediaPage() {
  const t = useTranslations("cms");
  const locale = useLocale() as "bn" | "en";
  const [q, setQ] = useState("");
  const { data, reload, setData } = useApi<{ data: CmsMedia[]; meta: { uploadsEnabled: boolean } }>(`/admin/media?limit=50${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  const [selected, setSelected] = useState<CmsMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = data?.data ?? [];

  return (
    <div>
      <PageTitle>{t("nav.media")}</PageTitle>
      <div className="mb-6">
        <Panel title={t("media.upload")}>
          {data && !data.meta.uploadsEnabled ? (
            <p className="text-sm">{t("media.disabled")}</p>
          ) : (
            <form
              className="grid gap-3 sm:grid-cols-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                setUploading(true);
                setError(null);
                try {
                  await apiFetch("/admin/media", { method: "POST", form });
                  (e.target as HTMLFormElement).reset();
                  await reload();
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : t("common.error"));
                } finally {
                  setUploading(false);
                }
              }}
            >
              <label className="text-sm sm:col-span-3">
                {t("media.file")}
                <input type="file" name="file" required accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="mt-1 block w-full text-sm" aria-describedby="upload-hint" />
                <span id="upload-hint" className="text-xs text-muted">
                  {t("media.uploadHint")}
                </span>
              </label>
              <label className="text-sm">
                {t("media.altBn")}
                <input name="alt_bn" lang="bn" className={field} maxLength={300} />
              </label>
              <label className="text-sm">
                {t("media.altEn")}
                <input name="alt_en" lang="en" className={field} maxLength={300} />
              </label>
              <label className="text-sm">
                {t("media.credit")}
                <input name="credit" className={field} maxLength={200} />
              </label>
              <div className="sm:col-span-3">
                <button type="submit" className={btnPrimary} disabled={uploading}>
                  {uploading ? t("common.saving") : t("media.upload")}
                </button>
              </div>
              <div className="sm:col-span-3">
                <ErrorNote message={error} />
              </div>
            </form>
          )}
        </Panel>
      </div>

      <label className="mb-4 block max-w-sm text-sm">
        {t("common.search")}
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className={field} />
      </label>

      {selected && (
        <div className="mb-6">
          <Panel
            title={t("common.edit")}
            actions={
              <button type="button" className={btn} onClick={() => setSelected(null)}>
                {t("common.close")}
              </button>
            }
          >
            <MediaEditor
              key={selected.id}
              media={selected}
              onSaved={(m) => setData((d) => (d ? { ...d, data: d.data.map((x) => (x.id === m.id ? m : x)) } : d))}
            />
          </Panel>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((m) => (
          <li key={m.id} className="overflow-hidden rounded border border-rule bg-surface">
            <button type="button" onClick={() => setSelected(m)} className="block w-full text-left">
              <img src={m.url} alt={m.alt[locale] ?? ""} className="aspect-video w-full object-cover" loading="lazy" style={{ objectPosition: `${m.focalX}% ${m.focalY}%` }} />
              <span className="block p-2 text-xs">
                <span className="block truncate">{m.alt[locale] || <em className="text-breaking">{t("media.missingAlt")}</em>}</span>
                <span className="text-muted">{t("media.usage", { count: m.usageCount })}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
