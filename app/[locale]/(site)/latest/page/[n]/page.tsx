import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageFromParam } from "@/components/news/paged-list";
import { isLocale } from "@/lib/config";
import { paths } from "@/lib/urls";
import { LatestView, latestMetadata } from "../../view";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return [{ n: "2" }];
}

async function resolve(params: PageProps<"/[locale]/latest/page/[n]">["params"]) {
  const { locale, n } = await params;
  if (!isLocale(locale)) notFound();
  return { locale, page: pageFromParam(n, paths.latest(locale)) };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/latest/page/[n]">): Promise<Metadata> {
  const { locale, page } = await resolve(params);
  return latestMetadata(locale, page);
}

export default async function Page({ params }: PageProps<"/[locale]/latest/page/[n]">) {
  const { locale, page } = await resolve(params);
  return <LatestView rawLocale={locale} page={page} />;
}
