import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/config";
import { localizeDigits } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { breadcrumbLd, jsonLd } from "@/lib/seo";

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}

export function Breadcrumbs({ locale, items }: { locale: Locale; items: { name: string; path?: string }[] }) {
  const t = getT(locale, "common");
  const all = [{ name: t("home"), path: `/${locale}` }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {all.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">›</span>}
            {it.path && i < all.length - 1 ? (
              <Link href={it.path} className="hover:text-ink hover:underline">
                {it.name}
              </Link>
            ) : (
              <span aria-current={i === all.length - 1 ? "page" : undefined}>{it.name}</span>
            )}
          </li>
        ))}
      </ol>
      <JsonLd data={breadcrumbLd(all.filter((x): x is { name: string; path: string } => Boolean(x.path)))} />
    </nav>
  );
}

export function SectionHeading({ children, href, linkLabel, id }: { children: ReactNode; href?: string; linkLabel?: string; id?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 id={id} className="section-title flex-1">
        {children}
      </h2>
      {href && linkLabel && (
        <Link href={href} className="shrink-0 text-sm font-semibold text-link hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-rule-strong bg-surface p-8 text-center">
      <p className="headline text-xl">{title}</p>
      {children && <div className="mt-2 text-ink-2">{children}</div>}
    </div>
  );
}

/** Server-rendered pagination with real links (works without JavaScript and for crawlers). */
export function Pagination({ locale, page, totalPages, hrefFor }: { locale: Locale; page: number; totalPages: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null;
  const t = getT(locale, "list");
  const btn = "inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-rule-strong px-4 font-semibold hover:bg-surface-2";
  return (
    <nav aria-label={t("pagination")} className="mt-8 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={btn}>
          ← {t("previous")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted">
        {t("page", { page: localizeDigits(locale, page) })} / {localizeDigits(locale, totalPages)}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={btn}>
          {t("next")} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="border-b border-rule pb-6">
      <h1 className="headline text-3xl sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-lg text-ink-2">{description}</p>}
      {children}
    </header>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 border-b border-rule py-4">
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-5 w-full" />
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-3 w-32" />
          </div>
          <div className="skeleton aspect-[4/3] w-28 sm:w-44" />
        </div>
      ))}
    </div>
  );
}
