import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TokenAction } from "@/components/site/token-action";
import { isLocale } from "@/lib/config";
import { getT } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/newsletter/unsubscribe">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getT(locale, "newsletter")("unsubTitle"), robots: { index: false, follow: false } };
}

export default async function Page({ params }: PageProps<"/[locale]/newsletter/unsubscribe">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div className="mx-auto max-w-xl py-10">
      <h1 className="headline text-3xl">{getT(locale, "newsletter")("unsubTitle")}</h1>
      <div className="mt-6">
        <Suspense fallback={null}>
          <TokenAction kind="unsubscribe" />
        </Suspense>
      </div>
    </div>
  );
}
