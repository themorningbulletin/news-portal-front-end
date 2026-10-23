"use client";

/* eslint-disable @next/next/no-img-element -- CMS thumbnails come from arbitrary media URLs */
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useApi, type CmsMedia } from "./hooks";
import { btn } from "./shell";

/** Modal media chooser built on <dialog>, which handles focus trapping and Escape natively. */
export function MediaPicker({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (m: CmsMedia) => void }) {
  const t = useTranslations("cms");
  const locale = useLocale() as "bn" | "en";
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const { data, loading } = useApi<{ data: CmsMedia[] }>(open ? `/admin/media?limit=50${q ? `&q=${encodeURIComponent(q)}` : ""}` : null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="media-picker-title" className="m-auto w-[min(56rem,95vw)] rounded-lg border border-rule bg-surface p-0 text-ink backdrop:bg-black/50">
      <div className="flex items-center justify-between border-b border-rule p-4">
        <h2 id="media-picker-title" className="font-semibold">
          {t("editor.chooseImage")}
        </h2>
        <button type="button" className={btn} onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
      <div className="p-4">
        <label className="text-sm">
          {t("common.search")}
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-rule-strong bg-paper px-3" />
        </label>
        {loading && <p className="mt-4 text-sm text-muted">{t("common.loading")}</p>}
        <ul className="mt-4 grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
          {(data?.data ?? []).map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(m);
                  onClose();
                }}
                className="block w-full rounded border border-rule text-left hover:border-brand focus-visible:border-brand"
              >
                <img src={m.url} alt={m.alt[locale] ?? ""} className="aspect-video w-full object-cover" loading="lazy" />
                <span className="block truncate p-2 text-xs">{m.alt[locale] || <em className="text-breaking">{t("media.missingAlt")}</em>}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
