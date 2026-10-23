import { cacheLife } from "next/cache";
import Link from "next/link";
import type { Locale } from "@/lib/config";
import { localizeDigits } from "@/lib/format";
import { getT } from "@/lib/i18n";
import type { Category } from "@/lib/types";
import { paths } from "@/lib/urls";
import { ConsentSettingsLink } from "./consent";
import { NewsletterForm } from "./newsletter-form";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function SiteFooter({
  locale,
  categories,
  pages,
  newsletterEnabled,
  adsEnabled,
}: {
  locale: Locale;
  categories: Category[];
  pages: { key: string; title: string }[];
  newsletterEnabled: boolean;
  adsEnabled: boolean;
}) {
  const t = getT(locale, "footer");
  const nav = getT(locale, "nav");
  const common = getT(locale, "common");
  const year = await currentYear();
  return (
    <footer data-site-footer className="mt-16 border-t border-rule bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="headline text-2xl">{common("siteName")}</p>
          <p className="mt-2 text-ink-2">{common("tagline")}</p>
          {newsletterEnabled && (
            <div className="mt-6">
              <NewsletterForm />
            </div>
          )}
        </div>
        <nav aria-label={t("sections")}>
          <h2 className="kicker mb-3">{t("sections")}</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {categories
              .filter((c) => !c.parentId)
              .map((c) => (
                <li key={c.id}>
                  <Link href={paths.category(locale, c.slug)} className="hover:underline">
                    {c.name}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
        <nav aria-label={t("explore")}>
          <h2 className="kicker mb-3">{t("explore")}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href={paths.latest(locale)} className="hover:underline">{nav("latest")}</Link></li>
            <li><Link href={paths.topics(locale)} className="hover:underline">{nav("topics")}</Link></li>
            <li><Link href={paths.archive(locale)} className="hover:underline">{nav("archive")}</Link></li>
            {/* Only pages the publisher has actually written and published are linked. */}
            {pages.map((p) => (
              <li key={p.key}>
                <Link href={paths.info(locale, p.key)} className="hover:underline">
                  {p.title}
                </Link>
              </li>
            ))}
            {adsEnabled && (
              <li>
                <ConsentSettingsLink label={t("consentSettings")} />
              </li>
            )}
          </ul>
        </nav>
      </div>
      <div className="border-t border-rule">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted sm:px-6">{t("rights", { year: localizeDigits(locale, year) })}</p>
      </div>
    </footer>
  );
}
