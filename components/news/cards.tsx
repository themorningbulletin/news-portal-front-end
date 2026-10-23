import Link from "next/link";
import type { Locale } from "@/lib/config";
import { localizeDigits } from "@/lib/format";
import { getT } from "@/lib/i18n";
import type { ArticleCard } from "@/lib/types";
import { paths } from "@/lib/urls";
import { StoryImage } from "./story-image";
import { StoryMeta } from "./story-meta";

type HeadingLevel = "h2" | "h3";

function Kicker({ locale, story }: { locale: Locale; story: ArticleCard }) {
  const t = getT(locale, "home");
  if (story.isBreaking) return <span className="kicker !text-breaking">{t("breaking")}</span>;
  if (story.format === "explainer") return <span className="kicker">{t("explainers")}</span>;
  if (story.format === "opinion") return <span className="kicker">{t("opinion")}</span>;
  return story.category ? <span className="kicker">{story.category.name}</span> : null;
}

/** The single most prominent story: large image, large headline, deck. */
export function LeadStory({ locale, story }: { locale: Locale; story: ArticleCard }) {
  return (
    <article className="grid gap-4 md:grid-cols-[3fr_2fr] md:gap-6">
      <Link href={paths.article(locale, story.slug)} className="card-link block md:order-2" tabIndex={-1} aria-hidden="true">
        {story.image && <StoryImage image={story.image} sizes="(min-width: 1280px) 720px, (min-width: 768px) 58vw, 100vw" preload />}
      </Link>
      <div className="flex flex-col justify-center md:order-1">
        <Kicker locale={locale} story={story} />
        <Link href={paths.article(locale, story.slug)} className="card-link">
          <h2 className="headline mt-1 text-[1.75rem] sm:text-4xl lg:text-[2.6rem]">{story.title}</h2>
        </Link>
        {story.summary && <p className="mt-3 text-base text-ink-2 sm:text-lg">{story.summary}</p>}
        <StoryMeta locale={locale} story={story} showAuthors />
      </div>
    </article>
  );
}

/** Image-topped card for grids. */
export function StoryCard({
  locale,
  story,
  as: H = "h3",
  showSummary = false,
  size = "md",
}: {
  locale: Locale;
  story: ArticleCard;
  as?: HeadingLevel;
  showSummary?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <article className="flex flex-col">
      {story.image && (
        <Link href={paths.article(locale, story.slug)} className="mb-3 block" tabIndex={-1} aria-hidden="true">
          <StoryImage image={story.image} sizes={size === "lg" ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"} ratio="3/2" />
        </Link>
      )}
      <Kicker locale={locale} story={story} />
      <Link href={paths.article(locale, story.slug)} className="card-link">
        <H className={`headline mt-1 ${size === "lg" ? "text-2xl" : "text-lg"}`}>{story.title}</H>
      </Link>
      {showSummary && story.summary && <p className="mt-2 line-clamp-3 text-[0.9375rem] text-ink-2">{story.summary}</p>}
      <StoryMeta locale={locale} story={story} />
    </article>
  );
}

/** Text-led row with a small thumbnail: used for feeds and lists. */
export function StoryRow({ locale, story, as: H = "h3" }: { locale: Locale; story: ArticleCard; as?: HeadingLevel }) {
  return (
    <article className="flex gap-4 border-b border-rule py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <Kicker locale={locale} story={story} />
        <Link href={paths.article(locale, story.slug)} className="card-link">
          <H className="headline mt-0.5 text-lg sm:text-xl">{story.title}</H>
        </Link>
        {story.summary && <p className="mt-1.5 line-clamp-2 hidden text-[0.9375rem] text-ink-2 sm:block">{story.summary}</p>}
        <StoryMeta locale={locale} story={story} />
      </div>
      {story.image && (
        <Link href={paths.article(locale, story.slug)} className="w-28 shrink-0 sm:w-44" tabIndex={-1} aria-hidden="true">
          <StoryImage image={story.image} sizes="(min-width: 640px) 176px, 112px" ratio="4/3" />
        </Link>
      )}
    </article>
  );
}

/** Headline only, for dense sidebars. */
export function StoryLine({ locale, story }: { locale: Locale; story: ArticleCard }) {
  return (
    <li className="border-b border-rule py-3 last:border-b-0">
      <Link href={paths.article(locale, story.slug)} className="card-link block">
        <h3 className="headline text-base">{story.title}</h3>
      </Link>
      <StoryMeta locale={locale} story={story} />
    </li>
  );
}

export function NumberedList({ locale, stories }: { locale: Locale; stories: ArticleCard[] }) {
  return (
    <ol className="divide-y divide-rule">
      {stories.map((s, i) => (
        <li key={s.id} className="flex gap-3 py-3">
          <span className="headline w-7 shrink-0 text-2xl text-brand" aria-hidden="true">
            {localizeDigits(locale, i + 1)}
          </span>
          <Link href={paths.article(locale, s.slug)} className="card-link">
            <h3 className="headline text-base">{s.title}</h3>
          </Link>
        </li>
      ))}
    </ol>
  );
}
