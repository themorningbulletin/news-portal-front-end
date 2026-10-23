import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, SectionHeading } from "@/components/news/common";
import { AlternateLink } from "@/components/site/header-controls";
import { getAuthors, getCategories, getPopularTags } from "@/lib/api";
import { isLocale, otherLocale } from "@/lib/config";
import { localizeDigits } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { paths } from "@/lib/urls";

export async function generateMetadata({ params }: PageProps<"/[locale]/topics">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getT(locale, "topics");
  return pageMetadata({ locale, title: t("title"), description: t("description"), path: paths.topics });
}

export default async function TopicsPage({ params }: PageProps<"/[locale]/topics">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale, "topics");
  const [categories, tags, authors] = await Promise.all([getCategories(locale), getPopularTags(locale, 40), getAuthors(locale)]);
  const top = categories.filter((c) => !c.parentId);
  return (
    <>
      <AlternateLink href={paths.topics(otherLocale(locale))} />
      <PageHeader title={t("title")} description={t("description")} />
      <section aria-labelledby="sections" className="mt-10">
        <SectionHeading id="sections">{t("sections")}</SectionHeading>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((c) => (
            <li key={c.id} className="rounded-lg border border-rule bg-surface p-5">
              <Link href={paths.category(locale, c.slug)} className="card-link">
                <h3 className="headline text-xl">{c.name}</h3>
              </Link>
              {c.description && <p className="mt-1 text-sm text-ink-2">{c.description}</p>}
              {categories.some((s) => s.parentId === c.id) && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {categories
                    .filter((s) => s.parentId === c.id)
                    .map((s) => (
                      <li key={s.id}>
                        <Link href={paths.category(locale, s.slug)} className="rounded-full bg-surface-2 px-3 py-1 text-sm hover:underline">
                          {s.name}
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>
      {tags.length > 0 && (
        <section aria-labelledby="popular-topics" className="mt-12">
          <SectionHeading id="popular-topics">{t("popular")}</SectionHeading>
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.id}>
                <Link href={paths.tag(locale, tag.slug!)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rule-strong px-4 hover:bg-surface-2">
                  {tag.name}
                  <span className="text-xs text-muted">{localizeDigits(locale, tag.count ?? 0)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {authors.length > 0 && (
        <section aria-labelledby="authors" className="mt-12">
          <SectionHeading id="authors">{t("authors")}</SectionHeading>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {authors
              .filter((a) => a.slug)
              .map((a) => (
                <li key={a.id}>
                  <Link href={paths.author(locale, a.slug!)} className="block rounded border border-rule bg-surface p-4 hover:border-brand">
                    <span className="font-semibold">{a.name}</span>
                    {a.bio && <span className="mt-1 block text-sm text-ink-2">{a.bio}</span>}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </>
  );
}
