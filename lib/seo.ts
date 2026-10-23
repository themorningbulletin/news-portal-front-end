import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, type Locale } from "./config";
import type { ArticleDetail, Image } from "./types";
import { absolute, paths } from "./urls";

/** hreflang/canonical for pages that exist in both languages under the same path shape. */
export function alternatesFor(locale: Locale, pathFor: (l: Locale) => string | null): Metadata["alternates"] {
  const bn = pathFor("bn");
  const en = pathFor("en");
  const languages: Record<string, string> = {};
  if (bn) languages["bn-BD"] = absolute(bn);
  if (en) languages["en"] = absolute(en);
  const xDefault = bn ?? en;
  if (xDefault && bn && en) languages["x-default"] = absolute(xDefault);
  const self = pathFor(locale);
  return { canonical: self ? absolute(self) : undefined, languages };
}

export const OG_LOCALE: Record<Locale, string> = { bn: "bn_BD", en: "en_US" };

export function imageUrl(img: Image | null | undefined): string | undefined {
  return img ? absolute(img.url) : undefined;
}

export function pageMetadata(opts: {
  locale: Locale;
  title: string;
  description: string;
  path: (l: Locale) => string | null;
  image?: Image | null;
  noindex?: boolean;
}): Metadata {
  const url = opts.path(opts.locale);
  return {
    title: opts.title,
    description: opts.description,
    alternates: alternatesFor(opts.locale, opts.path),
    openGraph: {
      type: "website",
      siteName: SITE_NAME[opts.locale],
      locale: OG_LOCALE[opts.locale],
      title: opts.title,
      description: opts.description,
      url: url ? absolute(url) : undefined,
      images: opts.image ? [{ url: imageUrl(opts.image)!, width: opts.image.width, height: opts.image.height, alt: opts.image.alt }] : undefined,
    },
    twitter: { card: opts.image ? "summary_large_image" : "summary", title: opts.title, description: opts.description },
    robots: opts.noindex ? { index: false, follow: true } : undefined,
  };
}

/** Serializes JSON-LD safely inside a <script> tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function organizationLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME[locale],
    alternateName: SITE_NAME[locale === "bn" ? "en" : "bn"],
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/logo-512.png`, width: 512, height: 512 },
  };
}

export function websiteLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/${locale}#website`,
    name: SITE_NAME[locale],
    url: absolute(paths.home(locale)),
    inLanguage: locale === "bn" ? "bn-BD" : "en",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absolute(it.path) })),
  };
}

/** Only facts visible on the page are included: no invented ratings, counts or authors. */
export function articleLd(a: ArticleDetail, locale: Locale) {
  const image = a.image ?? a.seo.socialImage;
  const url = absolute(paths.article(locale, a.slug));
  return {
    "@context": "https://schema.org",
    "@type": a.format === "opinion" ? "OpinionNewsArticle" : "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: a.title.slice(0, 110),
    description: a.seo.description || a.summary,
    inLanguage: locale === "bn" ? "bn-BD" : "en",
    datePublished: a.publishedAt ?? undefined,
    dateModified: a.updatedAt ?? a.publishedAt ?? undefined,
    image: image ? [imageUrl(image)] : undefined,
    articleSection: a.category?.name,
    keywords: a.tags.map((t) => t.name).join(", ") || undefined,
    author: a.authors.map((au) =>
      au.slug
        ? { "@type": "Person", name: au.name, url: absolute(paths.author(locale, au.slug)) }
        : { "@type": "Organization", name: au.name },
    ),
    publisher: { "@id": `${SITE_URL}/#organization` },
    isAccessibleForFree: true,
  };
}
