import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageFromParam } from "@/components/news/paged-list";
import { isLocale, type Locale } from "@/lib/config";
import { decodeSlug, paths } from "@/lib/urls";
import { TagView, tagMetadata } from "../../view";
import { staticValues } from "../../static-params";

export const ensureStatic = "navigation";

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const [first] = await staticValues(params.locale);
  return [{ slug: first!, n: "2" }];
}

async function resolve(params: PageProps<"/[locale]/tag/[slug]/page/[n]">["params"]) {
  const { locale, slug, n } = await params;
  if (!isLocale(locale)) notFound();
  return { locale, slug, page: pageFromParam(n, paths.tag(locale as Locale, decodeSlug(slug))) };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/tag/[slug]/page/[n]">): Promise<Metadata> {
  const { locale, slug, page } = await resolve(params);
  return tagMetadata(locale, slug, page);
}

export default async function Page({ params }: PageProps<"/[locale]/tag/[slug]/page/[n]">) {
  const { locale, slug, page } = await resolve(params);
  return <TagView rawLocale={locale} rawSlug={slug} page={page} />;
}
