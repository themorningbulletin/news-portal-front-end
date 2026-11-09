import Link from "next/link";
import type { Locale } from "@/lib/config";
import { getT } from "@/lib/i18n";
import type { ArticleCard, HomeBlock, HomeWidth } from "@/lib/types";
import { paths } from "@/lib/urls";
import { AdSlot } from "@/components/site/consent";
import { SectionHeading } from "./common";
import { StoryImage } from "./story-image";
import { StoryMeta } from "./story-meta";

/** Column spans on the 12-column homepage grid (static strings so Tailwind keeps them). */
const SPAN: Record<HomeWidth, string> = {
  12: "md:col-span-12",
  9: "md:col-span-12 lg:col-span-9",
  8: "md:col-span-12 lg:col-span-8",
  6: "md:col-span-6",
  4: "md:col-span-6 lg:col-span-4",
  3: "md:col-span-6 lg:col-span-3",
  2: "md:col-span-6 lg:col-span-2",
};

/** Columns for side-by-side cards in a narrow block (two on phones). */
const NARROW_COLS: Record<number, string> = { 1: "", 2: "grid-cols-2", 3: "grid-cols-2 sm:grid-cols-3" };

/** Big story: picture, headline and a short summary. */
function LeadItem({ locale, story, sizes, summary = true }: { locale: Locale; story: ArticleCard; sizes: string; summary?: boolean }) {
  return (
    <article>
      {story.image && (
        <Link href={paths.article(locale, story.slug)} className="mb-3 block" tabIndex={-1} aria-hidden="true">
          <StoryImage image={story.image} sizes={sizes} ratio="16/9" />
        </Link>
      )}
      <Link href={paths.article(locale, story.slug)} className="card-link">
        <h3 className="headline text-xl sm:text-2xl">{story.title}</h3>
      </Link>
      {summary && story.summary && <p className="mt-2 line-clamp-3 text-[0.9375rem] text-ink-2">{story.summary}</p>}
      <StoryMeta locale={locale} story={story} />
    </article>
  );
}

/** Headline beside a small picture, as in the side lists of a newspaper front. */
function ThumbItem({ locale, story }: { locale: Locale; story: ArticleCard }) {
  return (
    <li className="flex gap-3 border-b border-rule py-3 first:pt-0 last:border-b-0 last:pb-0">
      <Link href={paths.article(locale, story.slug)} className="card-link min-w-0 flex-1">
        <h3 className="headline text-base leading-snug">{story.title}</h3>
      </Link>
      {story.image && (
        <Link href={paths.article(locale, story.slug)} className="w-24 shrink-0 sm:w-28" tabIndex={-1} aria-hidden="true">
          <StoryImage image={story.image} sizes="112px" ratio="4/3" />
        </Link>
      )}
    </li>
  );
}

function ThumbList({ locale, stories }: { locale: Locale; stories: ArticleCard[] }) {
  if (stories.length === 0) return null;
  return (
    <ul>
      {stories.map((s) => (
        <ThumbItem key={s.id} locale={locale} story={s} />
      ))}
    </ul>
  );
}

/** Picture-topped card for grids; compact ones (narrow columns) drop the date line. */
function GridItem({ locale, story, compact = false }: { locale: Locale; story: ArticleCard; compact?: boolean }) {
  return (
    <article className="min-w-0">
      {story.image && (
        <Link href={paths.article(locale, story.slug)} className="mb-2 block" tabIndex={-1} aria-hidden="true">
          <StoryImage image={story.image} sizes={compact ? "(min-width: 1024px) 140px, 50vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"} ratio="3/2" />
        </Link>
      )}
      <Link href={paths.article(locale, story.slug)} className="card-link">
        <h3 className={`headline ${compact ? "text-[0.9375rem] leading-snug" : "text-base sm:text-lg"}`}>{story.title}</h3>
      </Link>
      {!compact && <StoryMeta locale={locale} story={story} />}
    </article>
  );
}

function SectionBody({ locale, block }: { locale: Locale; block: Extract<HomeBlock, { kind: "section" }> }) {
  const [first, ...rest] = block.items;
  const wide = block.width >= 8;
  const half = block.width === 6;
  if (!first) return null;

  switch (block.variant) {
    // Big story on the left, the rest as a picture list on the right.
    case "feature":
      return wide || half ? (
        <div className={`grid gap-6 ${wide ? "md:grid-cols-[3fr_2fr]" : "md:grid-cols-[1fr_1fr]"}`}>
          <LeadItem locale={locale} story={first} sizes="(min-width: 1024px) 45vw, 100vw" />
          <div className="md:border-l md:border-rule md:pl-6">
            <ThumbList locale={locale} stories={rest} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <LeadItem locale={locale} story={first} sizes="(min-width: 1024px) 25vw, 100vw" summary={false} />
          <ThumbList locale={locale} stories={rest} />
        </div>
      );

    // Stories stacked on the left, the big story on the right (on phones the big story comes first).
    case "side":
      return wide || half ? (
        <div className={`grid gap-6 ${wide ? "md:grid-cols-[2fr_3fr]" : "md:grid-cols-2"}`}>
          <div className="order-2 md:order-1 md:border-r md:border-rule md:pr-6">
            <ThumbList locale={locale} stories={rest} />
          </div>
          <div className="order-1 md:order-2">
            <LeadItem locale={locale} story={first} sizes="(min-width: 1024px) 45vw, 100vw" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <LeadItem locale={locale} story={first} sizes="(min-width: 1024px) 25vw, 100vw" summary={false} />
          <ThumbList locale={locale} stories={rest} />
        </div>
      );

    // Three columns: big story, two stacked, one more.
    case "trio": {
      if (block.width <= 4) {
        return (
          <div className="space-y-4">
            <LeadItem locale={locale} story={first} sizes="(min-width: 1024px) 33vw, 100vw" summary={false} />
            <ThumbList locale={locale} stories={rest} />
          </div>
        );
      }
      const [second, third, fourth] = rest;
      return (
        <div className="grid gap-5 sm:grid-cols-3">
          <LeadItem locale={locale} story={first} sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 100vw" summary={wide} />
          {(second || third) && (
            // Narrow middle column: headlines only, so the text is never squeezed by a picture.
            <ul className="sm:border-x sm:border-rule sm:px-5">
              {[second, third]
                .filter((s): s is ArticleCard => Boolean(s))
                .map((s) => (
                  <li key={s.id} className="border-b border-rule py-3 first:pt-0 last:border-b-0">
                    <Link href={paths.article(locale, s.slug)} className="card-link">
                      <h3 className="headline text-base leading-snug">{s.title}</h3>
                    </Link>
                    <StoryMeta locale={locale} story={s} />
                  </li>
                ))}
            </ul>
          )}
          {fourth && <GridItem locale={locale} story={fourth} compact={!wide} />}
        </div>
      );
    }

    // Big story in the middle, lists on either side (on narrower blocks: lead then list).
    case "center": {
      if (!wide) {
        return (
          <div className="space-y-4">
            <LeadItem locale={locale} story={first} sizes="(min-width: 1024px) 33vw, 100vw" />
            <ThumbList locale={locale} stories={rest} />
          </div>
        );
      }
      const left = rest.slice(0, Math.ceil(rest.length / 2));
      const right = rest.slice(left.length);
      return (
        <div className="grid gap-6 md:grid-cols-[1fr_1.4fr_1fr]">
          <div className="order-2 md:order-1 md:border-r md:border-rule md:pr-6">
            <ThumbList locale={locale} stories={left} />
          </div>
          <div className="order-1 md:order-2">
            <LeadItem locale={locale} story={first} sizes="(min-width: 1024px) 35vw, 100vw" />
          </div>
          <div className="order-3 md:border-l md:border-rule md:pl-6">
            <ThumbList locale={locale} stories={right} />
          </div>
        </div>
      );
    }

    // Cards side by side; narrow blocks show up to three small cards in a row.
    case "grid": {
      if (block.width <= 4) {
        const n = Math.min(block.items.length, 3);
        return (
          <div className={`grid gap-4 ${NARROW_COLS[n]}`}>
            {block.items.map((s) => (
              <GridItem key={s.id} locale={locale} story={s} compact />
            ))}
          </div>
        );
      }
      const cols = block.width >= 9 ? "sm:grid-cols-2 lg:grid-cols-4" : block.width === 8 ? "sm:grid-cols-3" : "sm:grid-cols-2";
      return (
        <div className={`grid gap-6 ${cols}`}>
          {block.items.map((s) => (
            <GridItem key={s.id} locale={locale} story={s} />
          ))}
        </div>
      );
    }

    // Big story on top, the rest underneath.
    case "mosaic":
      return (
        <div className="space-y-4">
          <LeadItem locale={locale} story={first} sizes={wide ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 25vw, 100vw"} summary={wide} />
          {wide ? (
            <div className="grid gap-6 border-t border-rule pt-4 sm:grid-cols-3">
              {rest.map((s) => (
                <GridItem key={s.id} locale={locale} story={s} />
              ))}
            </div>
          ) : (
            <ThumbList locale={locale} stories={rest} />
          )}
        </div>
      );

    // Picture list; wide blocks use two columns.
    default:
      return wide || half ? (
        <div className={`grid gap-x-8 ${wide ? "md:grid-cols-2" : ""}`}>
          {[block.items.slice(0, Math.ceil(block.items.length / (wide ? 2 : 1))), block.items.slice(Math.ceil(block.items.length / (wide ? 2 : 1)))].map((col, i) =>
            col.length ? (
              <ThumbList key={i} locale={locale} stories={col} />
            ) : null,
          )}
        </div>
      ) : (
        <ThumbList locale={locale} stories={block.items} />
      );
  }
}

/**
 * The editors' homepage layout: blocks fill 12-column rows in order. A block
 * that starts a new row has no divider on its left; the others get one.
 */
export function HomeBlocks({ locale, blocks }: { locale: Locale; blocks: HomeBlock[] }) {
  const t = getT(locale, "home");
  // Blocks saved before widths existed are full width.
  const all = blocks.map((raw) => ({ ...raw, kind: raw.kind ?? "section", width: raw.width ?? 12 }) as HomeBlock);
  const starts = all.reduce<{ used: number; starts: boolean[] }>(
    (acc, b) => {
      const start = acc.used === 0 || acc.used + b.width > 12;
      return { used: start ? b.width : acc.used + b.width, starts: [...acc.starts, start] };
    },
    { used: 0, starts: [] },
  ).starts;
  return (
    <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-12">
      {all.map((block, i) => {
        const startsRow = starts[i];
        const divider = startsRow ? "" : "lg:border-l lg:border-rule lg:pl-6";
        if (block.kind === "ad") {
          return (
            <div key={`ad-${i}`} className={`col-span-1 empty:hidden ${SPAN[block.width]} ${divider} [&>aside]:my-0`}>
              <AdSlot placement="home_feed" />
            </div>
          );
        }
        const id = `section-${block.category.id}`;
        return (
          <section key={block.category.id} aria-labelledby={id} className={`col-span-1 min-w-0 ${SPAN[block.width]} ${divider}`}>
            <SectionHeading id={id} href={paths.category(locale, block.category.slug)} linkLabel={block.width >= 6 ? t("moreIn", { section: block.category.name }) : t("more")}>
              {block.category.name}
            </SectionHeading>
            <SectionBody locale={locale} block={block} />
          </section>
        );
      })}
    </div>
  );
}
