import type { Metadata } from "next";
import { AuthorView, authorMetadata } from "./view";
import { staticValues } from "./static-params";

/** Complete static output: unknown values are real 404s. */
export const ensureStatic = "navigation";

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return (await staticValues(params.locale)).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/author/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  return authorMetadata(locale, slug, 1);
}

export default async function Page({ params }: PageProps<"/[locale]/author/[slug]">) {
  const { locale, slug } = await params;
  return <AuthorView rawLocale={locale} rawSlug={slug} page={1} />;
}
