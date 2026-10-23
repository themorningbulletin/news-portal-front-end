import Link from "next/link";
import type { Locale } from "@/lib/config";
import { formatDateTime, formatTime, formatDate, dhakaDay } from "@/lib/format";
import { getT } from "@/lib/i18n";
import type { ArticleCard } from "@/lib/types";
import { paths } from "@/lib/urls";

/** Absolute, time-zone fixed timestamps: no fake "x minutes ago" freshness. */
export function StoryTime({ locale, iso, mode = "auto" }: { locale: Locale; iso: string; mode?: "auto" | "full" | "date" }) {
  const text = mode === "full" ? formatDateTime(locale, iso) : mode === "date" ? formatDate(locale, iso, "medium") : formatShort(locale, iso);
  return <time dateTime={iso}>{text}</time>;
}

function formatShort(locale: Locale, iso: string) {
  return `${formatDate(locale, iso, "medium")} · ${formatTime(locale, iso)}`;
}

export function StoryMeta({ locale, story, showAuthors = false }: { locale: Locale; story: ArticleCard; showAuthors?: boolean }) {
  const t = getT(locale, "common");
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted">
      {showAuthors && story.authors.length > 0 && <span>{story.authors.map((a) => a.name).join(", ")}</span>}
      {story.publishedAt && <StoryTime locale={locale} iso={story.publishedAt} />}
      <span aria-hidden="true">·</span>
      <span>{t("minutesRead", { count: story.readingMinutes })}</span>
    </p>
  );
}

export function Byline({ locale, story }: { locale: Locale; story: ArticleCard }) {
  const t = getT(locale, "common");
  if (story.authors.length === 0) return null;
  return (
    <p className="text-sm text-ink-2">
      {t("by")}{" "}
      {story.authors.map((a, i) => (
        <span key={a.id}>
          {i > 0 && ", "}
          {a.slug ? (
            <Link href={paths.author(locale, a.slug)} className="font-semibold underline-offset-2 hover:underline">
              {a.name}
            </Link>
          ) : (
            <span className="font-semibold">{a.name}</span>
          )}
        </span>
      ))}
    </p>
  );
}

export function PublishedUpdated({ locale, story }: { locale: Locale; story: ArticleCard }) {
  const t = getT(locale, "common");
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      {story.publishedAt && (
        <span>
          {t("published")}:{" "}
          <Link href={paths.archiveDay(locale, dhakaDay(story.publishedAt))} className="hover:underline">
            <StoryTime locale={locale} iso={story.publishedAt} mode="full" />
          </Link>
        </span>
      )}
      {story.updatedAt && (
        <span>
          {t("updated")}: <StoryTime locale={locale} iso={story.updatedAt} mode="full" />
        </span>
      )}
    </p>
  );
}
