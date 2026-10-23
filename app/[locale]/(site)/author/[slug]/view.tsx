import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, JsonLd, PageHeader } from "@/components/news/common";
import { PagedList, pagePath } from "@/components/news/paged-list";
import { AlternateLink } from "@/components/site/header-controls";
import { getAuthor } from "@/lib/api";
import { isLocale, otherLocale, SITE_URL } from "@/lib/config";
import { getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { absolute, decodeSlug, paths } from "@/lib/urls";

async function loadAuthor(rawLocale: string, rawSlug: string) {
  if (!isLocale(rawLocale)) notFound();
  const author = await getAuthor(rawLocale, decodeSlug(rawSlug));
  if (!author?.slug) notFound();
  return { locale: rawLocale, author: { ...author, slug: author.slug } };
}

export async function authorMetadata(rawLocale: string, rawSlug: string, page: number): Promise<Metadata> {
  const { locale, author } = await loadAuthor(rawLocale, rawSlug);
  const t = getT(locale, "list");
  return pageMetadata({
    locale,
    title: page > 1 ? `${author.name} · ${t("page", { page })}` : author.name,
    description: author.bio || t("authorDescription", { name: author.name }),
    // Author slugs are shared across languages.
    path: (l) => pagePath(paths.author(l, author.slug), page),
  });
}

export async function AuthorView({ rawLocale, rawSlug, page }: { rawLocale: string; rawSlug: string; page: number }) {
  const { locale, author } = await loadAuthor(rawLocale, rawSlug);
  const t = getT(locale, "list");
  return (
    <>
      <AlternateLink href={paths.author(otherLocale(locale), author.slug)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name: author.name,
            description: author.bio || undefined,
            url: absolute(paths.author(locale, author.slug)),
            worksFor: { "@id": `${SITE_URL}/#organization` },
          },
        }}
      />
      <div className="mx-auto max-w-4xl">
        <Breadcrumbs locale={locale} items={[{ name: author.name }]} />
        <div className="mt-4">
          <PageHeader title={author.name} description={author.bio || t("authorDescription", { name: author.name })} />
        </div>
        <PagedList locale={locale} page={page} query={{ author: author.slug }} basePath={paths.author(locale, author.slug)} />
      </div>
    </>
  );
}
