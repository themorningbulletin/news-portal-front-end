"use client";

/* eslint-disable @next/next/no-img-element -- preview of arbitrary media URLs */
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { SITE_URL } from "@/lib/config";

export interface SeoCheck {
  id: string;
  status: "good" | "warn" | "bad";
  data?: Record<string, number | string>;
}
export interface SeoAnalysis {
  score: number;
  grade: "good" | "fair" | "poor";
  checks: SeoCheck[];
  snippet: { title: string; description: string; usesSummary: boolean };
}

export interface SeoDraft {
  id: string;
  locale: "bn" | "en";
  title: string;
  slug: string;
  summary: string;
  body: string;
  seo: { title: string; description: string; canonicalUrl: string; focusKeyword: string };
  featuredImage: string | null;
  imageAlt: string;
  tags: string[];
  category: string | null;
}

const GRADE_COLOR: Record<SeoAnalysis["grade"], string> = { good: "#0b6e4f", fair: "#b8860b", poor: "#b42318" };

export function ScoreRing({ score, grade, size = 64 }: { score: number; grade: SeoAnalysis["grade"]; size?: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`SEO ${score}/100`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="7" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={GRADE_COLOR[grade]}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="37" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">
        {score}
      </text>
    </svg>
  );
}

const ICON: Record<SeoCheck["status"], { mark: string; cls: string }> = {
  good: { mark: "✓", cls: "text-brand" },
  warn: { mark: "!", cls: "text-accent" },
  bad: { mark: "✗", cls: "text-breaking" },
};

export function CheckList({ checks }: { checks: SeoCheck[] }) {
  const t = useTranslations("cms.seo.checks");
  const order = { bad: 0, warn: 1, good: 2 };
  return (
    <ul className="space-y-1.5 text-sm">
      {[...checks]
        .sort((a, b) => order[a.status] - order[b.status])
        .map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            <span aria-hidden="true" className={`w-4 shrink-0 font-bold ${ICON[c.status].cls}`}>
              {ICON[c.status].mark}
            </span>
            <span>{t(c.id, (c.data ?? {}) as Record<string, string | number>)}</span>
          </li>
        ))}
    </ul>
  );
}

/** Live on-page SEO analysis for the story being edited (debounced, nothing is saved). */
export function SeoPanel({
  draft,
  imageUrl,
  focusKeyword,
  onFocusKeyword,
  readOnly,
}: {
  draft: SeoDraft;
  imageUrl: string | null;
  focusKeyword: string;
  onFocusKeyword: (v: string) => void;
  readOnly: boolean;
}) {
  const t = useTranslations("cms.seo");
  const [analysis, setAnalysis] = useState<SeoAnalysis | null>(null);
  const [pending, setPending] = useState(false);
  const payload = JSON.stringify(draft);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const d = JSON.parse(payload) as SeoDraft;
      setPending(true);
      apiFetch<{ data: SeoAnalysis }>("/admin/seo/analyze", {
        method: "POST",
        signal: ctrl.signal,
        body: {
          id: d.id,
          locale: d.locale,
          title: d.title.slice(0, 220),
          slug: d.slug.slice(0, 160),
          summary: d.summary,
          body: d.body,
          seo: d.seo,
          featuredImage: d.featuredImage,
          imageAlt: d.imageAlt,
          tags: d.tags,
          category: d.category,
        },
      })
        .then((r) => setAnalysis(r.data))
        .catch(() => undefined)
        .finally(() => setPending(false));
    }, 800);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [payload]);

  const host = new URL(SITE_URL).host;
  const path = `${host} › ${draft.locale} › news › ${draft.slug}`;
  const title = analysis?.snippet.title ?? (draft.seo.title || draft.title);
  const description = analysis?.snippet.description ?? (draft.seo.description || draft.summary);
  const cut = (s: string, n: number) => ([...s].length > n ? `${[...s].slice(0, n - 1).join("")}…` : s);

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        {t("focusKeyword")}
        <input
          lang={draft.locale}
          value={focusKeyword}
          onChange={(e) => onFocusKeyword(e.target.value)}
          readOnly={readOnly}
          maxLength={80}
          aria-describedby="focus-hint"
          className="mt-1 min-h-11 w-full rounded border border-rule-strong bg-paper px-3"
        />
        <span id="focus-hint" className="mt-1 block text-xs text-muted">
          {t("focusHint")}
        </span>
      </label>

      <div className="flex items-center gap-4" aria-live="polite">
        {analysis ? <ScoreRing score={analysis.score} grade={analysis.grade} /> : <div className="skeleton h-16 w-16 rounded-full" aria-hidden="true" />}
        <p className="text-sm text-muted">{pending ? t("analyzing") : analysis ? `${t("score")}: ${analysis.score}/100` : ""}</p>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase text-muted">{t("serp")}</p>
        <div className="rounded border border-rule bg-white p-3 text-left" lang={draft.locale} style={{ fontFamily: "Arial, sans-serif", colorScheme: "light" }}>
          <p className="truncate text-xs text-[#4d5156]">{path}</p>
          <p className="mt-0.5 text-lg leading-snug text-[#1a0dab]">{cut(title, 60)}</p>
          <p className="mt-0.5 text-sm leading-snug text-[#4d5156]">{cut(description, 160)}</p>
        </div>
        {analysis?.snippet.usesSummary && <p className="mt-1 text-xs text-accent">{t("usesSummary")}</p>}
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase text-muted">{t("social")}</p>
        <div className="overflow-hidden rounded border border-rule bg-surface-2" lang={draft.locale}>
          {imageUrl ? <img src={imageUrl} alt="" className="aspect-[1.91/1] w-full object-cover" /> : <div className="aspect-[1.91/1] w-full bg-rule" aria-hidden="true" />}
          <div className="p-3">
            <p className="text-xs uppercase text-muted">{host}</p>
            <p className="font-semibold leading-snug">{cut(title, 90)}</p>
            <p className="line-clamp-2 text-sm text-ink-2">{description}</p>
          </div>
        </div>
      </div>

      {analysis && <CheckList checks={analysis.checks} />}
    </div>
  );
}
