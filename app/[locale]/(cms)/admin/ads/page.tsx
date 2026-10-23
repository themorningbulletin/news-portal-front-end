"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useApi } from "@/components/cms/hooks";
import { btnPrimary, ErrorNote, field, PageTitle } from "@/components/cms/shell";
import { apiFetch, ApiError } from "@/lib/client-api";
import { ADSENSE_CLIENT } from "@/lib/config";

interface Placement {
  key: string;
  enabled: boolean;
  slotId: string;
  format: "auto" | "rectangle" | "horizontal" | "fluid";
  minHeight: number;
}

function PlacementForm({ initial }: { initial: Placement }) {
  const t = useTranslations("cms");
  const [p, setP] = useState(initial);
  const [state, setState] = useState<"" | "saved">("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid items-end gap-3 rounded-lg border border-rule bg-surface p-4 sm:grid-cols-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await apiFetch(`/admin/ads/${p.key}`, { method: "PUT", body: { ...p, minHeight: Number(p.minHeight) } });
          setState("saved");
        } catch (err) {
          setError(err instanceof ApiError ? err.message : t("common.error"));
        }
      }}
    >
      <p className="font-semibold sm:col-span-5">{t(`ads.placements.${p.key}`)}</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={p.enabled} onChange={(e) => { setP({ ...p, enabled: e.target.checked }); setState(""); }} />
        {t("ads.enabled")}
      </label>
      <label className="text-sm">
        {t("ads.slotId")}
        <input inputMode="numeric" pattern="\d{6,20}" value={p.slotId} onChange={(e) => { setP({ ...p, slotId: e.target.value.trim() }); setState(""); }} className={field} />
      </label>
      <label className="text-sm">
        {t("ads.format")}
        <select value={p.format} onChange={(e) => { setP({ ...p, format: e.target.value as Placement["format"] }); setState(""); }} className={field}>
          {["auto", "rectangle", "horizontal", "fluid"].map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        {t("ads.minHeight")}
        <input type="number" min={50} max={600} value={p.minHeight} onChange={(e) => { setP({ ...p, minHeight: Number(e.target.value) }); setState(""); }} className={field} />
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" className={btnPrimary}>
          {t("common.save")}
        </button>
        <span role="status" className="text-sm text-muted">
          {state === "saved" ? t("common.saved") : ""}
        </span>
      </div>
      <div className="sm:col-span-5">
        <ErrorNote message={error} />
      </div>
    </form>
  );
}

export default function AdsPage() {
  const t = useTranslations("cms");
  const { data, error } = useApi<{ data: Placement[] }>("/admin/ads");
  return (
    <div>
      <PageTitle>{t("nav.ads")}</PageTitle>
      <p className="mb-3 max-w-3xl text-sm text-ink-2">{t("ads.intro")}</p>
      {!ADSENSE_CLIENT && <p className="mb-4 rounded bg-surface-2 p-3 text-sm">{t("ads.clientMissing")}</p>}
      <ErrorNote message={error ? t("common.error") : null} />
      <div className="space-y-3">
        {(data?.data ?? []).map((p) => (
          <PlacementForm key={p.key} initial={p} />
        ))}
      </div>
    </div>
  );
}
