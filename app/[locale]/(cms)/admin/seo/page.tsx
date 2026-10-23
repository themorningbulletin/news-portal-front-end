"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useApi } from "@/components/cms/hooks";
import { ScoreRing } from "@/components/cms/seo-panel";
import { btn, ErrorNote, PageTitle, Panel } from "@/components/cms/shell";
import { ADSENSE_CLIENT, SITE_URL } from "@/lib/config";
import { paths } from "@/lib/urls";

interface Overview {
  summary: { analysed: number; averageScore: number; good: number; fair: number; poor: number; limit: number };
  issueCounts: Record<string, { warn: number; bad: number }>;
  sectionIssues: { id: string; locale: "bn" | "en"; name: string; slug: string; issues: string[] }[];
  trustPages: { key: string; bn: boolean; en: boolean }[];
  authorIssues: { id: string; name: string; missingBio: boolean }[];
}
interface Row {
  id: string;
  locale: "bn" | "en";
  title: string;
  slug: string;
  score: number;
  grade: "good" | "fair" | "poor";
  issues: { id: string; status: "warn" | "bad" }[];
}

const gradeOf = (score: number) => (score >= 80 ? "good" : score >= 50 ? "fair" : "poor") as Row["grade"];

/**
 * Site-wide SEO health for editors: average on-page score, the most common
 * problems (click to filter), per-story scores, section descriptions, trust
 * pages and technical status. Scores are computed by the API from the same
 * rules as the editor's live SEO panel.
 */
export default function SeoDashboardPage() {
  const t = useTranslations("cms");
  const footer = useTranslations("footer.pages");
  const locale = useLocale() as "bn" | "en";
  const [issue, setIssue] = useState("");
  const [lang, setLang] = useState("");
  const [page, setPage] = useState(1);
  const overview = useApi<{ data: Overview }>("/admin/seo/overview");
  const params = new URLSearchParams({ page: String(page), limit: "20", sort: "score" });
  if (issue) params.set("issue", issue);
  if (lang) params.set("locale", lang);
  const rows = useApi<{ data: Row[]; meta: { total: number; totalPages: number } }>(`/admin/seo/articles?${params}`);
  const o = overview.data?.data;

  const issues = o ? Object.entries(o.issueCounts).sort((a, b) => b[1].bad * 2 + b[1].warn - (a[1].bad * 2 + a[1].warn)) : [];
  const maxIssue = Math.max(1, ...issues.map(([, v]) => v.bad + v.warn));
  const https = SITE_URL.startsWith("https://");
  const verification = Boolean(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION);

  const siteChecks: { id: string; ok: boolean; href?: string }[] = [
    { id: "https", ok: https },
    { id: "verification", ok: verification },
    { id: "sitemap", ok: true, href: "/sitemap.xml" },
    { id: "robots", ok: true, href: "/robots.txt" },
    { id: "adsTxt", ok: Boolean(ADSENSE_CLIENT), href: ADSENSE_CLIENT ? "/ads.txt" : undefined },
  ];

  return (
    <div>
      <PageTitle>{t("seo.title")}</PageTitle>
      <p className="mb-6 max-w-3xl text-sm text-ink-2">{t("seo.intro")}</p>
      <ErrorNote message={overview.error || rows.error ? t("common.error") : null} />

      {!o ? (
        <div className="skeleton h-40" aria-hidden="true" />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="col-span-2 flex items-center gap-4 rounded-lg border border-rule bg-surface p-4 lg:col-span-1">
              <ScoreRing score={o.summary.averageScore} grade={gradeOf(o.summary.averageScore)} size={72} />
              <div>
                <p className="text-xs text-muted">{t("seo.average")}</p>
                <p className="text-2xl font-semibold tabular-nums">{o.summary.averageScore}</p>
              </div>
            </div>
            {(
              [
                ["analysed", o.summary.analysed, ""],
                ["good", o.summary.good, "text-brand"],
                ["fair", o.summary.fair, "text-accent"],
                ["poor", o.summary.poor, "text-breaking"],
              ] as const
            ).map(([k, v, cls]) => (
              <div key={k} className="rounded-lg border border-rule bg-surface p-4">
                <p className="text-xs text-muted">{t(`seo.${k}`)}</p>
                <p className={`text-2xl font-semibold tabular-nums ${cls}`}>{v}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <Panel title={t("seo.issues")}>
              <p className="mb-3 text-xs text-muted">{t("seo.issuesHint")}</p>
              {issues.length === 0 ? (
                <p className="text-sm">{t("seo.noIssues")}</p>
              ) : (
                <ul className="space-y-2">
                  {issues.map(([id, v]) => (
                    <li key={id}>
                      <button
                        type="button"
                        aria-pressed={issue === id}
                        onClick={() => {
                          setIssue(issue === id ? "" : id);
                          setPage(1);
                        }}
                        className="w-full rounded p-2 text-left text-sm hover:bg-surface-2 aria-pressed:bg-brand-soft"
                      >
                        <span className="flex justify-between gap-3">
                          <span>{t(`seo.issueNames.${id}`)}</span>
                          <span className="shrink-0 tabular-nums text-muted">{v.bad + v.warn}</span>
                        </span>
                        <span className="mt-1 flex h-2 overflow-hidden rounded bg-surface-2" aria-hidden="true">
                          <span className="bg-breaking" style={{ width: `${(v.bad / maxIssue) * 100}%` }} />
                          <span className="bg-accent" style={{ width: `${(v.warn / maxIssue) * 100}%` }} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <div className="space-y-4">
              <Panel title={t("seo.site")}>
                <ul className="space-y-2 text-sm">
                  {siteChecks.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3">
                      <span>
                        <span aria-hidden="true" className={c.ok ? "text-brand" : "text-accent"}>
                          {c.ok ? "✓ " : "! "}
                        </span>
                        {t(`seo.siteChecks.${c.id}`)}
                      </span>
                      {c.href && (
                        <a href={c.href} target="_blank" rel="noopener" className="text-link underline">
                          {t("seo.open")}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title={t("seo.trust")}>
                <p className="mb-2 text-xs text-muted">{t("seo.trustHint")}</p>
                <table className="w-full text-sm">
                  <tbody>
                    {o.trustPages.map((p) => (
                      <tr key={p.key} className="border-b border-rule last:border-b-0">
                        <th scope="row" className="py-1.5 text-left font-normal">
                          {footer(p.key)}
                        </th>
                        {(["bn", "en"] as const).map((l) => (
                          <td key={l} className={`py-1.5 text-right ${p[l] ? "text-brand" : "text-breaking"}`}>
                            {l.toUpperCase()} {p[l] ? "✓" : "✗"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Link href={paths.admin(locale, "pages")} className="mt-2 inline-block text-sm text-link underline">
                  {t("nav.pages")} →
                </Link>
              </Panel>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <Panel title={t("seo.sections")}>
              {o.sectionIssues.length === 0 ? (
                <p className="text-sm">{t("seo.noIssues")}</p>
              ) : (
                <ul className="divide-y divide-rule text-sm">
                  {o.sectionIssues.map((s) => (
                    <li key={`${s.id}-${s.locale}`} className="flex flex-wrap justify-between gap-2 py-2">
                      <span lang={s.locale}>
                        {s.name} <span className="text-xs uppercase text-muted">{s.locale}</span>
                      </span>
                      <span className="text-muted">{s.issues.map((i) => t(`seo.sectionIssues.${i}`)).join(", ")}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href={paths.admin(locale, "taxonomy")} className="mt-2 inline-block text-sm text-link underline">
                {t("nav.taxonomy")} →
              </Link>
            </Panel>
            <Panel title={t("seo.authors")}>
              {o.authorIssues.length === 0 ? (
                <p className="text-sm">{t("seo.noIssues")}</p>
              ) : (
                <ul className="divide-y divide-rule text-sm">
                  {o.authorIssues.map((a) => (
                    <li key={a.id} className="flex justify-between gap-2 py-2">
                      <span>{a.name}</span>
                      <span className="text-muted">{a.missingBio ? t("seo.missingBio") : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}

      <Panel
        title={t("seo.stories")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="seo-lang">
              {t("common.language")}
            </label>
            <select
              id="seo-lang"
              value={lang}
              onChange={(e) => {
                setLang(e.target.value);
                setPage(1);
              }}
              className="min-h-10 rounded border border-rule-strong bg-paper px-2 text-sm"
            >
              <option value="">{t("common.all")}</option>
              <option value="bn">{t("common.bangla")}</option>
              <option value="en">{t("common.english")}</option>
            </select>
            {issue && (
              <button type="button" className={btn} onClick={() => setIssue("")}>
                {t("seo.clearFilter")} ×
              </button>
            )}
          </div>
        }
      >
        <ul className="divide-y divide-rule">
          {(rows.data?.data ?? []).map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-3">
              <ScoreRing score={r.score} grade={r.grade} size={44} />
              <div className="min-w-0 flex-1">
                <Link href={paths.admin(locale, `articles/${r.id}`)} className="font-semibold hover:underline" lang={r.locale}>
                  {r.title}
                </Link>
                <span className="ml-2 text-xs uppercase text-muted">{r.locale}</span>
                <p className="mt-1 flex flex-wrap gap-1">
                  {r.issues.slice(0, 6).map((i) => (
                    <span key={i.id} className={`rounded px-1.5 py-0.5 text-xs ${i.status === "bad" ? "bg-breaking/15" : "bg-accent/15"}`}>
                      {t(`seo.issueNames.${i.id}`)}
                    </span>
                  ))}
                </p>
              </div>
              <Link href={paths.admin(locale, `articles/${r.id}`)} className={`${btn} shrink-0`}>
                {t("seo.edit")}
              </Link>
            </li>
          ))}
        </ul>
        {rows.data && rows.data.meta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button type="button" className={btn} disabled={page <= 1} onClick={() => setPage(page - 1)}>
              ← {t("common.previous")}
            </button>
            <span className="text-sm text-muted">
              {page} / {rows.data.meta.totalPages}
            </span>
            <button type="button" className={btn} disabled={page >= rows.data.meta.totalPages} onClick={() => setPage(page + 1)}>
              {t("common.next")} →
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}
