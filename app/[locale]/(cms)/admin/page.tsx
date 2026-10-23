"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { formatWhen, useApi } from "@/components/cms/hooks";
import { btn, can, ErrorNote, PageTitle, Panel, StatusBadge } from "@/components/cms/shell";
import { useAuth } from "@/components/providers";
import { apiFetch } from "@/lib/client-api";
import { paths } from "@/lib/urls";

interface Row {
  id: string;
  locale: "bn" | "en";
  title: string;
  status: string;
  updatedAt: string;
  scheduledFor?: string;
}
interface Dashboard {
  homepageControls: { id: string; locale: "bn" | "en"; title: string; breakingUntil: string | null; pinnedUntil: string | null }[];
  counts: Record<string, number>;
  inReview: Row[];
  scheduled: Row[];
  recentlyUpdated: Row[];
  healthWarnings: Row[];
  publicationActivity: { day: string; count: number }[];
  traffic: null | {
    definition: string;
    daily: { day: string; views: number }[];
    topStories: { id: string; views: number; title?: string; locale?: "bn" | "en"; slug?: string }[];
    referrers: { host: string; views: number }[];
    newsletter: Record<string, number>;
  };
}

function Bars({ rows, label }: { rows: { key: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{label}</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <th scope="row" className="w-28 py-1 pr-2 text-left font-normal text-muted">
              {r.key}
            </th>
            <td className="py-1">
              <div className="flex items-center gap-2">
                <div className="h-3 rounded bg-brand" style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 4 : 0 }} />
                <span className="tabular-nums">{r.value}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ArticleRows({ rows, when, locale }: { rows: Row[]; when?: "scheduledFor"; locale: "bn" | "en" }) {
  const t = useTranslations("cms");
  if (rows.length === 0) return <p className="text-sm text-muted">{t("dashboard.noData")}</p>;
  return (
    <ul className="divide-y divide-rule">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-2">
          <Link href={paths.admin(locale, `articles/${r.id}`)} className="min-w-0 truncate hover:underline" lang={r.locale}>
            {r.title}
          </Link>
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
            <StatusBadge status={r.status} />
            {formatWhen(locale, when ? r[when] : r.updatedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const t = useTranslations("cms");
  const locale = useLocale() as "bn" | "en";
  const { data, error, reload } = useApi<{ data: Dashboard }>("/admin/dashboard");
  const { me } = useAuth();
  const d = data?.data;

  return (
    <div>
      <PageTitle>{t("nav.dashboard")}</PageTitle>
      <ErrorNote message={error ? t("common.error") : null} />
      {!d ? (
        <div className="skeleton h-64" aria-hidden="true" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          {can(me, "homepage:manage") && (
            <div className="lg:col-span-2">
              <Panel title={t("tools.homepageControls")}>
                {d.homepageControls.length === 0 ? (
                  <p className="text-sm text-muted">{t("tools.noControls")}</p>
                ) : (
                  <ul className="divide-y divide-rule">
                    {d.homepageControls.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <span className="min-w-0">
                          <Link href={paths.admin(locale, `articles/${c.id}`)} className="font-semibold hover:underline" lang={c.locale}>
                            {c.title}
                          </Link>
                          <span className="block text-xs text-muted">
                            {c.breakingUntil && t("tools.breakingUntil", { time: formatWhen(locale, c.breakingUntil) })}
                            {c.breakingUntil && c.pinnedUntil ? " · " : ""}
                            {c.pinnedUntil && t("tools.pinnedUntil", { time: formatWhen(locale, c.pinnedUntil) })}
                          </span>
                        </span>
                        {c.breakingUntil && (
                          <button
                            type="button"
                            className={btn}
                            onClick={async () => {
                              await apiFetch(`/admin/articles/${c.id}/end-breaking`, { method: "POST" });
                              await reload();
                            }}
                          >
                            {t("tools.endBreaking")}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          )}
          <Panel title={t("dashboard.counts")}>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {["draft", "in_review", "scheduled", "published", "archived"].map((s) => (
                <div key={s} className="rounded bg-surface-2 p-3">
                  <dt className="text-xs text-muted">{t(`status.${s}`)}</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{d.counts[s] ?? 0}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title={t("dashboard.activity")}>
            {d.publicationActivity.length ? (
              <Bars label={t("dashboard.activity")} rows={d.publicationActivity.map((a) => ({ key: a.day.slice(5), value: a.count }))} />
            ) : (
              <p className="text-sm text-muted">{t("dashboard.noData")}</p>
            )}
          </Panel>
          <Panel title={t("dashboard.inReview")}>
            <ArticleRows locale={locale} rows={d.inReview} />
          </Panel>
          <Panel title={t("dashboard.scheduled")}>
            <ArticleRows locale={locale} rows={d.scheduled} when="scheduledFor" />
          </Panel>
          <Panel title={t("dashboard.recent")}>
            <ArticleRows locale={locale} rows={d.recentlyUpdated} />
          </Panel>
          <Panel title={t("dashboard.health")}>
            <p className="mb-2 text-xs text-muted">{t("dashboard.healthHint")}</p>
            <ArticleRows locale={locale} rows={d.healthWarnings} />
          </Panel>
          {d.traffic && (
            <>
              <Panel title={t("dashboard.traffic")}>
                <p className="mb-2 text-xs text-muted">{d.traffic.definition}</p>
                {d.traffic.daily.length ? (
                  <Bars label={t("dashboard.traffic")} rows={d.traffic.daily.map((x) => ({ key: x.day.slice(5), value: x.views }))} />
                ) : (
                  <p className="text-sm text-muted">{t("dashboard.noData")}</p>
                )}
              </Panel>
              <Panel title={t("dashboard.topStories")}>
                {d.traffic.topStories.length ? (
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    {d.traffic.topStories.map((s) => (
                      <li key={s.id}>
                        <Link href={paths.admin(locale, `articles/${s.id}`)} className="hover:underline" lang={s.locale}>
                          {s.title ?? s.id}
                        </Link>{" "}
                        <span className="text-muted">
                          · {s.views} {t("dashboard.views")}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted">{t("dashboard.noData")}</p>
                )}
              </Panel>
              <Panel title={t("dashboard.referrers")}>
                {d.traffic.referrers.length ? (
                  <Bars label={t("dashboard.referrers")} rows={d.traffic.referrers.map((r) => ({ key: r.host, value: r.views }))} />
                ) : (
                  <p className="text-sm text-muted">{t("dashboard.noData")}</p>
                )}
              </Panel>
              <Panel title={t("dashboard.newsletter")}>
                <dl className="grid grid-cols-3 gap-3 text-center">
                  {["active", "pending", "unsubscribed"].map((k) => (
                    <div key={k} className="rounded bg-surface-2 p-3">
                      <dt className="text-xs text-muted">{k}</dt>
                      <dd className="text-xl font-semibold tabular-nums">{d.traffic!.newsletter[k] ?? 0}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            </>
          )}
        </div>
      )}
    </div>
  );
}
