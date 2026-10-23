import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { getT } from "@/lib/i18n";
import { paths } from "@/lib/urls";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Shown (with HTTP 403) when a signed-in user opens a newsroom area they may not use. */
export default async function NoAccessPage({ params }: PageProps<"/[locale]/no-access">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale, "errors");
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="headline text-3xl">{t("noAccessTitle")}</h1>
      <p className="mt-3 text-lg text-ink-2">{t("noAccessBody")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={paths.home(locale)} className="inline-flex min-h-11 items-center rounded bg-brand px-5 font-semibold text-brand-ink">
          {t("goHome")}
        </Link>
        <Link href={paths.account(locale)} className="inline-flex min-h-11 items-center rounded border border-rule-strong px-5 font-semibold">
          {t("myAccount")}
        </Link>
      </div>
    </div>
  );
}
