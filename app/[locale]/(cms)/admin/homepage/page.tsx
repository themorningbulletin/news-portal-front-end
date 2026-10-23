"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useApi, type CmsCategory } from "@/components/cms/hooks";
import { btn, btnPrimary, ErrorNote, PageTitle, Panel } from "@/components/cms/shell";
import { apiFetch } from "@/lib/client-api";

type Section = { category: string; variant: "feature" | "grid" | "list" };

export default function HomepageSettingsPage() {
  const t = useTranslations("cms");
  const locale = useLocale() as "bn" | "en";
  const cats = useApi<{ data: CmsCategory[] }>("/admin/categories");
  const current = useApi<{ data: { sections: Section[] } }>("/admin/settings/homepage");
  const [edited, setSections] = useState<Section[] | null>(null);
  const sections = edited ?? current.data?.data.sections ?? [];
  const [add, setAdd] = useState("");
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");

  const name = (id: string) => cats.data?.data.find((c) => c.id === id)?.name[locale] ?? id;
  const move = (i: number, d: -1 | 1) => {
    const next = [...sections];
    const [s] = next.splice(i, 1);
    next.splice(i + d, 0, s!);
    setSections(next);
    setState("");
  };

  return (
    <div>
      <PageTitle>{t("nav.homepage")}</PageTitle>
      <p className="mb-4 max-w-3xl text-sm text-ink-2">{t("homepage.intro")}</p>
      <Panel>
        <ol className="divide-y divide-rule">
          {sections.map((s, i) => (
            <li key={s.category} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="font-semibold">
                {i + 1}. {name(s.category)}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`v-${s.category}`}>
                  {t("homepage.variant")}
                </label>
                <select
                  id={`v-${s.category}`}
                  value={s.variant}
                  onChange={(e) => {
                    setSections(sections.map((x, j) => (j === i ? { ...x, variant: e.target.value as Section["variant"] } : x)));
                    setState("");
                  }}
                  className="min-h-10 rounded border border-rule-strong bg-paper px-2 text-sm"
                >
                  {(["feature", "grid", "list"] as const).map((v) => (
                    <option key={v} value={v}>
                      {t(`homepage.variants.${v}`)}
                    </option>
                  ))}
                </select>
                <button type="button" className={btn} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${t("homepage.moveUp")}: ${name(s.category)}`}>
                  ↑
                </button>
                <button type="button" className={btn} disabled={i === sections.length - 1} onClick={() => move(i, 1)} aria-label={`${t("homepage.moveDown")}: ${name(s.category)}`}>
                  ↓
                </button>
                <button type="button" className={btn} onClick={() => setSections(sections.filter((_, j) => j !== i))}>
                  {t("homepage.remove")}
                </button>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-sm">
            {t("homepage.add")}
            <select value={add} onChange={(e) => setAdd(e.target.value)} className="mt-1 block min-h-11 rounded border border-rule-strong bg-paper px-2">
              <option value="">—</option>
              {(cats.data?.data ?? [])
                .filter((c) => !sections.some((s) => s.category === c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name[locale]}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            className={btn}
            disabled={!add}
            onClick={() => {
              setSections([...sections, { category: add, variant: "grid" }]);
              setAdd("");
            }}
          >
            +
          </button>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className={btnPrimary}
            disabled={state === "saving"}
            onClick={async () => {
              setState("saving");
              try {
                await apiFetch("/admin/settings/homepage", { method: "PUT", body: { sections } });
                setState("saved");
              } catch {
                setState("error");
              }
            }}
          >
            {t("common.save")}
          </button>
          <span role="status" className="text-sm text-muted">
            {state === "saved" ? t("common.saved") : ""}
          </span>
        </div>
        <ErrorNote message={state === "error" ? t("common.saveFailed") : null} />
      </Panel>
    </div>
  );
}
