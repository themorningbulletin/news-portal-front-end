"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useApi, type CmsArticle } from "@/components/cms/hooks";
import { PageTitle } from "@/components/cms/shell";

const DEVICES = { mobile: 375, tablet: 768, desktop: 1280 } as const;

export default function PreviewPage() {
  const t = useTranslations("cms");
  const { id } = useParams<{ id: string }>();
  const [device, setDevice] = useState<keyof typeof DEVICES>("mobile");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const valid = /^[a-f0-9]{24}$/.test(id);
  const { data } = useApi<{ data: CmsArticle }>(valid ? `/admin/articles/${id}` : null);
  const [version, setVersion] = useState<string>(id);
  const a = data?.data;
  const versions = a ? [{ id: a.id, locale: a.locale, title: a.title }, ...a.translations] : [];
  const current = versions.find((v) => v.id === version) ?? versions[0];

  const seg = (active: boolean) => `min-h-10 rounded px-3 text-sm font-semibold ${active ? "bg-brand text-brand-ink" : "border border-rule-strong"}`;

  return (
    <div>
      <PageTitle>{t("preview.title")}</PageTitle>
      <p className="mb-3 rounded bg-surface-2 p-2 text-sm">{t("preview.notice")}</p>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div role="group" aria-label={t("preview.device")} className="flex gap-1">
          {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((d) => (
            <button key={d} type="button" aria-pressed={device === d} className={seg(device === d)} onClick={() => setDevice(d)}>
              {t(`preview.${d}`)} ({DEVICES[d]})
            </button>
          ))}
        </div>
        <div role="group" aria-label={t("preview.theme")} className="flex gap-1">
          {(["light", "dark"] as const).map((th) => (
            <button key={th} type="button" aria-pressed={theme === th} className={seg(theme === th)} onClick={() => setTheme(th)}>
              {th === "light" ? "☀" : "☾"}
            </button>
          ))}
        </div>
        {versions.length > 1 && (
          <div role="group" aria-label={t("common.language")} className="flex gap-1">
            {versions.map((v) => (
              <button key={v.id} type="button" aria-pressed={current?.id === v.id} className={seg(current?.id === v.id)} onClick={() => setVersion(v.id)}>
                {v.locale === "bn" ? t("common.bangla") : t("common.english")}
              </button>
            ))}
          </div>
        )}
      </div>
      {current && (
        <div className="overflow-x-auto rounded-lg border border-rule bg-surface-2 p-3">
          <iframe
            key={`${current.id}-${theme}`}
            title={`${t("preview.title")}: ${current.title}`}
            src={`/${current.locale}/preview-frame/${current.id}?theme=${theme}`}
            className="mx-auto block h-[80vh] rounded border border-rule bg-paper"
            style={{ width: DEVICES[device] }}
          />
        </div>
      )}
    </div>
  );
}
