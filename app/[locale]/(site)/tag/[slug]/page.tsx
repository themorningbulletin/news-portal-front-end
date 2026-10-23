import type { Metadata } from "next";
import { TagView, tagMetadata } from "./view";
import { staticValues } from "./static-params";

/** Complete static output: unknown values are real 404s. */
export const ensureStatic = "navigation";

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return (await staticValues(params.locale)).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/tag/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  return tagMetadata(locale, slug, 1);
}

export default async function Page({ params }: PageProps<"/[locale]/tag/[slug]">) {
  const { locale, slug } = await params;
  return <TagView rawLocale={locale} rawSlug={slug} page={1} />;
}
