"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("errors");
  const locale = useLocale();
  return (
    <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="headline text-6xl text-brand" aria-hidden="true">
        ৪০৪
      </p>
      <h1 className="headline mt-4 text-3xl">{t("notFoundTitle")}</h1>
      <p className="mt-3 text-lg text-ink-2">{t("notFoundBody")}</p>
      <Link href={`/${locale}`} className="mt-8 inline-flex min-h-11 items-center rounded bg-brand px-5 font-semibold text-brand-ink">
        {t("goHome")}
      </Link>
    </main>
  );
}
