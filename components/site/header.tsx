import Link from "next/link";
import type { Locale } from "@/lib/config";
import { SITE_NAME } from "@/lib/config";
import { getT } from "@/lib/i18n";
import type { ArticleCard, Category } from "@/lib/types";
import { paths } from "@/lib/urls";
import { AccountButton, LanguageSwitch, ThemeToggle, TodayDate } from "./header-controls";
import { SectionsMenu } from "./sections-menu";

function Wordmark({ locale }: { locale: Locale }) {
  return (
    <Link href={paths.home(locale)} className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label={SITE_NAME[locale]}>
      {/* eslint-disable @next/next/no-img-element -- small static brand images with fixed dimensions */}
      <img src="/brand/mark.svg" alt="" width={44} height={44} className="hidden h-9 w-9 min-[380px]:block sm:h-11 sm:w-11" />
      <img src="/brand/wordmark-light.png" alt="" width={182} height={44} className="logo-light h-6 w-auto min-[380px]:h-7 sm:h-11" />
      <img src="/brand/wordmark-dark.png" alt="" width={182} height={44} className="logo-dark h-6 w-auto min-[380px]:h-7 sm:h-11" />
      {/* eslint-enable @next/next/no-img-element */}
    </Link>
  );
}

export function SiteHeader({ locale, categories }: { locale: Locale; categories: Category[] }) {
  const t = getT(locale, "nav");
  const common = getT(locale, "common");
  const top = categories.filter((c) => !c.parentId);

  return (
    <header data-site-header className="border-b border-rule bg-paper">
      <a href="#main" className="skip-link">
        {common("skipToContent")}
      </a>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-3 text-xs text-muted sm:px-6">
        <p className="flex gap-2">
          <TodayDate />
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className="hidden sm:inline">{common("edition")}</span>
        </p>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Wordmark locale={locale} />
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href={paths.search(locale)}
            className="inline-flex h-10 w-10 items-center justify-center rounded border border-rule-strong hover:bg-surface-2 sm:w-auto sm:px-3"
            aria-label={t("search")}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="ml-2 hidden text-sm font-semibold sm:inline">{t("search")}</span>
          </Link>
          <LanguageSwitch />
          <AccountButton />
        </div>
      </div>

      <nav aria-label={t("primary")} className="border-t border-rule">
        <div className="mx-auto flex max-w-7xl items-stretch px-2 sm:px-4">
          {/* Sections scroll horizontally on small screens; the full list is one tap away. */}
          <ul className="flex flex-1 gap-1 overflow-x-auto py-1 [scrollbar-width:none]">
            <li>
              <Link href={paths.latest(locale)} className="inline-flex min-h-11 items-center whitespace-nowrap rounded px-3 text-[0.9375rem] font-semibold hover:bg-surface-2">
                {t("latest")}
              </Link>
            </li>
            {top.map((c) => (
              <li key={c.id}>
                <Link href={paths.category(locale, c.slug)} className="inline-flex min-h-11 items-center whitespace-nowrap rounded px-3 text-[0.9375rem] hover:bg-surface-2">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <SectionsMenu
            label={t("allSections")}
            openLabel={t("menuOpen")}
            closeLabel={t("closeMenu")}
            sections={categories.map((c) => ({ href: paths.category(locale, c.slug), label: c.name, sub: Boolean(c.parentId) }))}
            extra={[
              { href: paths.latest(locale), label: t("latest") },
              { href: paths.topics(locale), label: t("topics") },
              { href: paths.archive(locale), label: t("archive") },
              { href: paths.search(locale), label: t("search") },
            ]}
          />
        </div>
      </nav>
    </header>
  );
}

export function BreakingTicker({ locale, stories }: { locale: Locale; stories: ArticleCard[] }) {
  if (stories.length === 0) return null;
  const t = getT(locale, "home");
  // No auto-scrolling: the list is static and can be scrolled by the reader.
  return (
    <section aria-label={t("breakingLabel")} className="border-b border-breaking/30 bg-breaking/10">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6">
        <span className="shrink-0 rounded bg-breaking px-2 py-1 text-xs font-bold uppercase text-breaking-ink">{t("breaking")}</span>
        <ul className="flex gap-6 overflow-x-auto text-sm font-semibold [scrollbar-width:thin]">
          {stories.map((s) => (
            <li key={s.id} className="whitespace-nowrap">
              <Link href={paths.article(locale, s.slug)} className="hover:underline">
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
