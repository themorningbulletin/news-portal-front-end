"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useApi } from "@/components/cms/hooks";
import { btn, ErrorNote, PageTitle, StatusBadge } from "@/components/cms/shell";
import { paths } from "@/lib/urls";

interface Item {
  id: string;
  locale: "bn" | "en";
  title: string;
  status: string;
  at: string | null;
}

const DHAKA_OFFSET_MS = 6 * 3_600_000;
const dhakaParts = (d: Date) => {
  const x = new Date(d.getTime() + DHAKA_OFFSET_MS);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), h: x.getUTCHours(), min: x.getUTCMinutes() };
};

/** Month view of scheduled and published stories, in newsroom time (Asia/Dhaka). */
export default function CalendarPage() {
  const t = useTranslations("cms");
  const locale = useLocale() as "bn" | "en";
  const [month, setMonth] = useState(() => {
    const p = dhakaParts(new Date());
    return { y: p.y, m: p.m };
  });
  const { data, error } = useApi<{ data: Item[] }>(`/admin/articles/calendar?year=${month.y}&month=${month.m}`);
  const nf = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-GB");
  const title = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(month.y, month.m - 1, 15)),
  );
  const today = dhakaParts(new Date());

  const byDay = useMemo(() => {
    const map = new Map<number, Item[]>();
    for (const it of data?.data ?? []) {
      if (!it.at) continue;
      const p = dhakaParts(new Date(it.at));
      if (p.y !== month.y || p.m !== month.m) continue;
      map.set(p.d, [...(map.get(p.d) ?? []), it]);
    }
    return map;
  }, [data, month]);

  const daysInMonth = new Date(Date.UTC(month.y, month.m, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(month.y, month.m - 1, 1)).getUTCDay();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weekdays = t("calendar.weekdays").split(",");
  const timeFormat = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Dhaka" });
  const time = (iso: string) => timeFormat.format(new Date(iso));
  const move = (delta: number) =>
    setMonth(({ y, m }) => {
      const n = m + delta;
      return n < 1 ? { y: y - 1, m: 12 } : n > 12 ? { y: y + 1, m: 1 } : { y, m: n };
    });

  const entry = (it: Item) => (
    <li key={it.id}>
      <Link href={paths.admin(locale, `articles/${it.id}`)} className="block rounded px-1.5 py-1 text-xs hover:bg-surface-2" lang={it.locale}>
        <span className={it.status === "scheduled" ? "font-semibold text-focus" : ""}>{it.at ? time(it.at) : ""}</span> {it.title}
      </Link>
    </li>
  );

  return (
    <div>
      <PageTitle>{t("calendar.title")}</PageTitle>
      <p className="mb-4 text-sm text-ink-2">{t("calendar.intro")}</p>
      <ErrorNote message={error ? t("common.error") : null} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={btn} onClick={() => move(-1)}>
          ← {t("calendar.previous")}
        </button>
        <h2 className="headline text-xl" aria-live="polite">
          {title}
        </h2>
        <button type="button" className={btn} onClick={() => move(1)}>
          {t("calendar.next")} →
        </button>
      </div>
      <p className="mb-3 flex flex-wrap gap-3 text-xs text-muted">
        <StatusBadge status="scheduled" /> <StatusBadge status="published" />
      </p>

      {/* Month grid on larger screens */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-rule bg-rule text-sm">
          {weekdays.map((w) => (
            <div key={w} className="bg-surface-2 p-2 text-center text-xs font-semibold">
              {w}
            </div>
          ))}
          {cells.map((d, i) => (
            <div
              key={i}
              className={`min-h-28 bg-surface p-1.5 ${d && today.y === month.y && today.m === month.m && today.d === d ? "ring-2 ring-inset ring-brand" : ""}`}
            >
              {d && (
                <>
                  <p className="text-xs text-muted">{nf.format(d)}</p>
                  <ul className="mt-1 space-y-0.5">{(byDay.get(d) ?? []).map(entry)}</ul>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Day-by-day list on phones */}
      <div className="md:hidden">
        {byDay.size === 0 ? (
          <p className="text-sm text-muted">{t("calendar.empty")}</p>
        ) : (
          <ol className="space-y-3">
            {[...byDay.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([d, items]) => (
                <li key={d} className="rounded-lg border border-rule bg-surface p-3">
                  <p className="mb-1 font-semibold">
                    {nf.format(d)} {title}
                  </p>
                  <ul className="space-y-1">
                    {items.map((it) => (
                      <li key={it.id} className="flex items-center gap-2 text-sm">
                        <StatusBadge status={it.status} />
                        <Link href={paths.admin(locale, `articles/${it.id}`)} className="min-w-0 flex-1 truncate hover:underline" lang={it.locale}>
                          {it.title}
                        </Link>
                        <span className="text-xs text-muted">{it.at ? time(it.at) : ""}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ol>
        )}
      </div>
    </div>
  );
}
