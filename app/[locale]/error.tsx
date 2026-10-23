"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  const common = useTranslations("common");
  const locale = useLocale();
  return (
    <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="headline text-3xl">{t("errorTitle")}</h1>
      <p className="mt-3 text-lg text-ink-2">{t("errorBody")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="min-h-11 rounded bg-brand px-5 font-semibold text-brand-ink">
          {common("retry")}
        </button>
        <Link href={`/${locale}`} className="inline-flex min-h-11 items-center rounded border border-rule-strong px-5 font-semibold">
          {t("goHome")}
        </Link>
      </div>
    </main>
  );
}
