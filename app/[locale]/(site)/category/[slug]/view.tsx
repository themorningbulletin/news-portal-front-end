import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, PageHeader } from "@/components/news/common";
import { PagedList, pagePath } from "@/components/news/paged-list";
import { AlternateLink } from "@/components/site/header-controls";
import { getCategory } from "@/lib/api";
import { isLocale, otherLocale } from "@/lib/config";
import { getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { decodeSlug, paths } from "@/lib/urls";

export async function loadCategory(rawLocale: string, rawSlug: string) {
  if (!isLocale(rawLocale)) notFound();
  const category = await getCategory(rawLocale, decodeSlug(rawSlug));
  if (!category) notFound();
  return { locale: rawLocale, category };
}

export async function categoryMetadata(rawLocale: string, rawSlug: string, page: number): Promise<Metadata> {
  const { locale, category } = await loadCategory(rawLocale, rawSlug);
  const t = getT(locale, "list");
  return pageMetadata({
    locale,
    title: page > 1 ? `${category.name} · ${t("page", { page })}` : category.name,
    description: category.description || t("categoryDescription", { name: category.name }),
    path: (l) => (category.alternates[l] ? pagePath(paths.category(l, category.alternates[l]!), page) : null),
  });
}

export async function CategoryView({ rawLocale, rawSlug, page }: { rawLocale: string; rawSlug: string; page: number }) {
  const { locale, category } = await loadCategory(rawLocale, rawSlug);
  const t = getT(locale, "list");
  const other = otherLocale(locale);
  const crumbs = [
    ...(category.parent ? [{ name: category.parent.name, path: paths.category(locale, category.parent.slug) }] : []),
    { name: category.name },
  ];
  return (
    <>
      <AlternateLink href={category.alternates[other] ? paths.category(other, category.alternates[other]!) : null} />
      <div className="mx-auto max-w-4xl">
        <Breadcrumbs locale={locale} items={crumbs} />
        <div className="mt-4">
          <PageHeader title={category.name} description={category.description || t("categoryDescription", { name: category.name })}>
            {category.children.length > 0 && (
              <nav aria-label={t("subsections")} className="mt-4 flex flex-wrap gap-2">
                {category.children.map((c) => (
                  <Link key={c.id} href={paths.category(locale, c.slug)} className="rounded-full border border-rule-strong px-3 py-1.5 text-sm hover:bg-surface-2">
                    {c.name}
                  </Link>
                ))}
              </nav>
            )}
          </PageHeader>
        </div>
        <PagedList locale={locale} page={page} query={{ category: category.slug }} basePath={paths.category(locale, category.slug)} adPlacement="category_feed" />
      </div>
    </>
  );
}
