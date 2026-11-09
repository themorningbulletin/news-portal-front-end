"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useApi, type CmsCategory } from "@/components/cms/hooks";
import { btn, btnPrimary, ErrorNote, PageTitle, Panel } from "@/components/cms/shell";
import { apiFetch, ApiError } from "@/lib/client-api";

type Variant = "feature" | "side" | "center" | "trio" | "grid" | "list" | "mosaic";
type Width = 12 | 9 | 8 | 6 | 4 | 3 | 2;
type Block = { kind: "section" | "ad"; category: string | null; variant: Variant; width: Width; count: number | null };

const VARIANTS: Variant[] = ["feature", "side", "center", "trio", "grid", "list", "mosaic"];
const WIDTHS: Width[] = [12, 9, 8, 6, 4, 3, 2];
const DEFAULT_COUNT: Record<Variant, number> = { feature: 5, side: 3, center: 5, trio: 4, grid: 4, list: 4, mosaic: 4 };
const select = "min-h-10 rounded border border-rule-strong bg-paper px-2 text-sm";

/** Rows as the homepage builds them: blocks fill 12 columns, then a new row starts. */
function rows(blocks: Block[]) {
  const out: { block: Block; index: number }[][] = [];
  let used = 12;
  blocks.forEach((block, index) => {
    if (used + block.width > 12) {
      out.push([]);
      used = 0;
    }
    out[out.length - 1]!.push({ block, index });
    used += block.width;
  });
  return out;
}

export default function HomepageSettingsPage() {
  const t = useTranslations("cms");
  const locale = useLocale() as "bn" | "en";
  const cats = useApi<{ data: CmsCategory[] }>("/admin/categories");
  const current = useApi<{ data: { sections: Partial<Block>[]; published?: Record<string, { bn: number; en: number }> } }>("/admin/settings/homepage");
  const [edited, setBlocks] = useState<Block[] | null>(null);
  const saved: Block[] = (current.data?.data.sections ?? []).map((b) => ({
    kind: b.kind ?? "section",
    category: b.category ?? null,
    variant: b.variant ?? "grid",
    width: b.width ?? 12,
    count: b.count ?? null,
  }));
  const blocks = edited ?? saved;
  const published = current.data?.data.published ?? {};
  const [add, setAdd] = useState("");
  const [state, setState] = useState<"" | "saving" | "saved">("");
  const [error, setError] = useState<string | null>(null);

  const categories = cats.data?.data ?? [];
  const tree = categories.filter((c) => !c.parent).flatMap((p) => [p, ...categories.filter((c) => c.parent === p.id)]);
  const name = (id: string | null) => (id ? (categories.find((c) => c.id === id)?.name[locale] ?? id) : t("homepage.ad"));
  const change = (next: Block[]) => {
    setBlocks(next);
    setState("");
  };
  const patch = (i: number, p: Partial<Block>) => change(blocks.map((b, j) => (j === i ? { ...b, ...p } : b)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...blocks];
    const [b] = next.splice(i, 1);
    next.splice(i + d, 0, b!);
    change(next);
  };

  return (
    <div>
      <PageTitle>{t("nav.homepage")}</PageTitle>
      <p className="mb-4 max-w-3xl text-sm text-ink-2">{t("homepage.intro2")}</p>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title={t("homepage.blocks")}>
          <p className="mb-3 rounded bg-surface-2 p-3 text-sm">{t("homepage.firstBlock")}</p>
          <ol className="divide-y divide-rule">
            {blocks.map((b, i) => {
              const counts = b.category ? published[b.category] : undefined;
              const emptyIn = counts ? (["bn", "en"] as const).filter((l) => counts[l] === 0) : [];
              return (
                <li key={`${b.category ?? "ad"}-${i}`} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      {i + 1}. {b.kind === "ad" ? `📢 ${t("homepage.ad")}` : name(b.category)}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      <button type="button" className={btn} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${t("homepage.moveUp")}: ${name(b.category)}`}>
                        ↑
                      </button>
                      <button type="button" className={btn} disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label={`${t("homepage.moveDown")}: ${name(b.category)}`}>
                        ↓
                      </button>
                      <button type="button" className={btn} onClick={() => change(blocks.filter((_, j) => j !== i))}>
                        {t("homepage.remove")}
                      </button>
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    {b.kind === "section" && (
                      <label className="text-xs text-muted">
                        {t("homepage.style")}
                        <select value={b.variant} onChange={(e) => patch(i, { variant: e.target.value as Variant })} className={`${select} mt-1 block text-ink`}>
                          {VARIANTS.map((v) => (
                            <option key={v} value={v}>
                              {t(`homepage.variants.${v}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="text-xs text-muted">
                      {t("homepage.width")}
                      <select value={b.width} onChange={(e) => patch(i, { width: Number(e.target.value) as Width })} className={`${select} mt-1 block text-ink`}>
                        {WIDTHS.map((w) => (
                          <option key={w} value={w}>
                            {t(`homepage.widths.w${w}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {b.kind === "section" && (
                      <label className="text-xs text-muted">
                        {t("homepage.count")}
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={b.count ?? DEFAULT_COUNT[b.variant]}
                          onChange={(e) => patch(i, { count: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })}
                          className={`${select} mt-1 block w-20 text-ink`}
                        />
                      </label>
                    )}
                  </div>
                  {b.kind === "section" && counts && (
                    <p className={`mt-2 text-xs ${emptyIn.length ? "text-breaking" : "text-muted"}`}>
                      {t("homepage.published", { bn: counts.bn, en: counts.en })}
                      {emptyIn.length > 0 && ` · ${t("homepage.hiddenIn", { langs: emptyIn.map((l) => (l === "bn" ? t("common.bangla") : t("common.english"))).join(", ") })}`}
                    </p>
                  )}
                  {b.kind === "section" && !counts && b.category && <p className="mt-2 text-xs text-muted">{t("homepage.countAfterSave")}</p>}
                </li>
              );
            })}
          </ol>

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-rule pt-4">
            <label className="text-sm">
              {t("homepage.add")}
              <select value={add} onChange={(e) => setAdd(e.target.value)} className="mt-1 block min-h-11 rounded border border-rule-strong bg-paper px-2">
                <option value="">—</option>
                {tree
                  .filter((c) => !blocks.some((b) => b.category === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent ? "   — " : ""}
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
                change([...blocks, { kind: "section", category: add, variant: "feature", width: 12, count: null }]);
                setAdd("");
              }}
            >
              + {t("homepage.addSection")}
            </button>
            <button type="button" className={btn} onClick={() => change([...blocks, { kind: "ad", category: null, variant: "grid", width: 12, count: null }])}>
              + {t("homepage.addAd")}
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              className={btnPrimary}
              disabled={state === "saving"}
              onClick={async () => {
                setState("saving");
                setError(null);
                try {
                  await apiFetch("/admin/settings/homepage", { method: "PUT", body: { sections: blocks } });
                  await current.reload();
                  setBlocks(null);
                  setState("saved");
                } catch (err) {
                  setState("");
                  setError(err instanceof ApiError ? err.message : t("common.saveFailed"));
                }
              }}
            >
              {t("common.save")}
            </button>
            <span role="status" className="text-sm text-muted">
              {state === "saved" ? t("homepage.savedNote") : edited ? t("common.unsaved") : ""}
            </span>
          </div>
          <ErrorNote message={error} />
        </Panel>

        <Panel title={t("homepage.preview")}>
          <p className="mb-3 text-xs text-muted">{t("homepage.previewNote")}</p>
          <div className="space-y-1.5">
            <div className="grid grid-cols-12 gap-1">
              <div className="col-span-9 rounded bg-brand-soft px-1.5 py-3 text-[0.6875rem] font-semibold">{t("homepage.leadBlock")}</div>
              <div className="col-span-3 rounded bg-surface-2 px-1.5 py-3 text-[0.6875rem]">{t("homepage.mostRead")}</div>
            </div>
            {rows(blocks).map((row, r) => (
              <div key={r} className="grid grid-cols-12 gap-1">
                {row.map(({ block, index }) => (
                  <div
                    key={index}
                    style={{ gridColumn: `span ${block.width} / span ${block.width}` }}
                    className={`truncate rounded px-1.5 py-3 text-[0.6875rem] ${block.kind === "ad" ? "border border-dashed border-accent bg-accent/10" : "bg-surface-2"}`}
                    title={block.kind === "ad" ? t("homepage.ad") : name(block.category)}
                  >
                    {index + 1}. {block.kind === "ad" ? t("homepage.ad") : name(block.category)}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <dl className="mt-4 space-y-2 text-xs">
            {VARIANTS.map((v) => (
              <div key={v}>
                <dt className="font-semibold">{t(`homepage.variants.${v}`)}</dt>
                <dd className="text-muted">{t(`homepage.variantHelp.${v}`)}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </div>
  );
}
