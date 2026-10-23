"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { formatWhen, useApi } from "@/components/cms/hooks";
import { btn, ErrorNote, PageTitle } from "@/components/cms/shell";

interface Entry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary?: string;
  createdAt: string;
  actor?: { displayName?: string; email?: string } | null;
}

export default function AuditPage() {
  const t = useTranslations("cms");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const { data, error } = useApi<{ data: Entry[]; meta: { totalPages: number } }>(`/admin/audit?page=${page}&limit=50`);
  return (
    <div>
      <PageTitle>{t("nav.audit")}</PageTitle>
      <ErrorNote message={error ? t("common.error") : null} />
      <div className="overflow-x-auto rounded-lg border border-rule bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-rule text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-3">{t("audit.when")}</th>
              <th className="p-3">{t("audit.who")}</th>
              <th className="p-3">{t("audit.action")}</th>
              <th className="p-3">{t("audit.entity")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {(data?.data ?? []).map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap p-3">{formatWhen(locale, e.createdAt)}</td>
                <td className="p-3">{e.actor?.displayName ?? e.actor?.email ?? t("audit.system")}</td>
                <td className="p-3 font-mono text-xs">{e.action}</td>
                <td className="p-3">
                  {e.entityType}
                  {e.summary ? `: ${e.summary}` : e.entityId ? ` ${e.entityId}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex justify-between">
          <button type="button" className={btn} disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ←
          </button>
          <button type="button" className={btn} disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>
            →
          </button>
        </div>
      )}
    </div>
  );
}
