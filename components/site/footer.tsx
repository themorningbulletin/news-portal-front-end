import { cacheLife } from "next/cache";
import Link from "next/link";
import type { Locale } from "@/lib/config";
import { localizeDigits } from "@/lib/format";
import { getT } from "@/lib/i18n";
import type { Category, SocialKey } from "@/lib/types";
import { paths } from "@/lib/urls";
import { ConsentSettingsLink } from "./consent";
import { NewsletterForm } from "./newsletter-form";
import { SOCIAL_LABEL, SOCIAL_ORDER, SocialIcon } from "./social-icons";

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
  social = {},
}: {
  locale: Locale;
  categories: Category[];
  pages: { key: string; title: string }[];
  newsletterEnabled: boolean;
  adsEnabled: boolean;
  social?: Partial<Record<SocialKey, string>>;
}) {
  const t = getT(locale, "footer");
  const nav = getT(locale, "nav");
  const common = getT(locale, "common");
  const year = await currentYear();
  const profiles = SOCIAL_ORDER.filter((k) => social[k]);
  // Information pages in a fixed, familiar order; only published ones are linked.
  const PAGE_ORDER = ["about", "contact", "advertise", "editorial-policy", "corrections", "privacy", "terms"];
  const infoPages = [...pages].sort((a, b) => PAGE_ORDER.indexOf(a.key) - PAGE_ORDER.indexOf(b.key));
  return (
    <footer data-site-footer className="mt-16 border-t border-rule bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.3fr_1.4fr_1fr_1fr]">
        <div>
          <p className="headline text-2xl">{common("siteName")}</p>
          <p className="mt-2 text-ink-2">{common("tagline")}</p>
          {profiles.length > 0 && (
            <div className="mt-5">
              <h2 className="kicker mb-2">{t("follow")}</h2>
              <ul className="flex flex-wrap gap-2">
                {profiles.map((k) => (
                  <li key={k}>
                    <a
                      href={social[k]}
                      target="_blank"
                      rel="noopener noreferrer me"
                      aria-label={`${SOCIAL_LABEL[k]} (${t("newTab")})`}
                      title={SOCIAL_LABEL[k]}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rule-strong text-ink-2 transition-colors hover:border-brand hover:bg-brand hover:text-brand-ink"
                    >
                      <SocialIcon name={k} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
        {infoPages.length > 0 && (
          <nav aria-label={t("info")}>
            <h2 className="kicker mb-3">{t("info")}</h2>
            <ul className="space-y-2 text-sm">
              {/* Only pages the publisher has actually written and published are linked. */}
              {infoPages.map((p) => (
                <li key={p.key}>
                  <Link href={paths.info(locale, p.key)} className="hover:underline">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <nav aria-label={t("explore")}>
          <h2 className="kicker mb-3">{t("explore")}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href={paths.latest(locale)} className="hover:underline">{nav("latest")}</Link></li>
            <li><Link href={paths.topics(locale)} className="hover:underline">{nav("topics")}</Link></li>
            <li><Link href={paths.archive(locale)} className="hover:underline">{nav("archive")}</Link></li>
            <li><Link href={paths.search(locale)} className="hover:underline">{nav("search")}</Link></li>
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
