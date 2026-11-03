"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { formatWhen, fromLocalInput, toLocalInput, useApi, type CmsCategory } from "@/components/cms/hooks";
import { btn, btnPrimary, ErrorNote, field, PageTitle, Panel } from "@/components/cms/shell";
import { apiFetch, ApiError } from "@/lib/client-api";
import { paths } from "@/lib/urls";

type Loc = "bn" | "en";
interface Item {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: { id: string; name: { bn?: string; en?: string } } | null;
  publishedAt: string | null;
  pinnedUntil: string | null;
  breakingUntil: string | null;
}
interface Overview {
  homepage: { lead: { id: string; title: string } | null; top: { id: string; title: string }[]; editorsPicks: { id: string; title: string }[]; breaking: string[] };
  pins: Item[];
  featured: Item[];
  picks: Item[];
  breaking: Item[];
  notLive: Item[];
}
interface Found {
  id: string;
  title: string;
  status: string;
  category?: { _id?: string; name?: { bn?: string; en?: string } } | null;
  publishedAt?: string;
}

const inHours = (h: number) => toLocalInput(new Date(Date.now() + h * 3_600_000).toISOString());
const badge = "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold";

export default function CurationPage() {
  const t = useTranslations("cms");
  const ui = useLocale() as Loc;
  const [locale, setLocale] = useState<Loc>(ui);
  const [section, setSection] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, reload } = useApi<{ data: Overview }>(`/admin/curation?locale=${locale}`);
  const cats = useApi<{ data: CmsCategory[] }>("/admin/categories");
  const [search, setSearch] = useState("");
  const found = useApi<{ data: Found[] }>(
    search.trim().length > 1 ? `/admin/articles?status=published&sort=published&limit=10&locale=${locale}&q=${encodeURIComponent(search.trim())}${section ? `&category=${section}` : ""}` : null,
  );
  const d = data?.data;

  const visible = (items: Item[]) =>
    items.filter((a) => (!section || a.category?.id === section) && (!text.trim() || a.title.toLowerCase().includes(text.trim().toLowerCase())));
  const catName = (a: { category?: { name?: { bn?: string; en?: string } } | null }) => a.category?.name?.[ui] || a.category?.name?.bn || a.category?.name?.en || "—";

  const act = async (id: string, action: string, until?: string) => {
    setError(null);
    setBusy(`${id}:${action}`);
    try {
      await apiFetch(`/admin/curation/${id}`, { method: "POST", body: { action, ...(until ? { until: fromLocalInput(until) } : {}) } });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setBusy(null);
    }
  };
  const isBusy = (id: string) => busy?.startsWith(`${id}:`) ?? false;

  const topIds = useMemo(() => d?.homepage.top.map((x) => x.id) ?? [], [d]);
  const pickIds = useMemo(() => d?.homepage.editorsPicks.map((x) => x.id) ?? [], [d]);
  const leadId = d?.homepage.lead?.id;

  const Title = ({ a }: { a: { id: string; title: string } }) => (
    <Link href={paths.admin(ui, `articles/${a.id}`)} className="font-semibold text-link underline-offset-2 hover:underline break-words">
      {a.title}
    </Link>
  );

  return (
    <div>
      <PageTitle>{t("nav.curation")}</PageTitle>
      <p className="mb-4 max-w-3xl text-sm text-muted">{t("curation.intro")}</p>

      <div className="mb-4 grid gap-3 rounded-lg border border-rule bg-surface p-3 sm:grid-cols-3">
        <label className="text-sm">
          {t("curation.language")}
          <select value={locale} onChange={(e) => setLocale(e.target.value as Loc)} className={field}>
            <option value="bn">বাংলা</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="text-sm">
          {t("curation.section")}
          <select value={section} onChange={(e) => setSection(e.target.value)} className={field}>
            <option value="">{t("common.all")}</option>
            {(cats.data?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name[ui] || c.name.bn || c.name.en}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          {t("curation.filterTitle")}
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} className={field} />
        </label>
      </div>
      <ErrorNote message={error} />

      {!d ? (
        <div className="skeleton h-64" aria-hidden="true" />
      ) : (
        <div className="space-y-6">
          <Panel title={t("curation.leadTitle")}>
            <p className="mb-3 text-sm text-muted">{t("curation.leadHelp")}</p>
            {d.pins.length === 0 && <p className="text-sm">{t("curation.noPins")}</p>}
            <ol className="divide-y divide-rule">
              {visible(d.pins).map((a) => {
                const rank = d.pins.findIndex((p) => p.id === a.id) + 1;
                return (
                  <li key={a.id} className="grid gap-2 py-3 md:grid-cols-[3rem_1fr_auto] md:items-center">
                    <span className="headline text-2xl text-muted">#{rank}</span>
                    <div className="min-w-0">
                      <Title a={a} />
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        {a.id === leadId ? <span className={`${badge} bg-brand-soft text-ink`}>{t("curation.onHomeNow")}</span> : <span className={`${badge} bg-surface-2`}>{t("curation.waiting", { rank })}</span>}
                        <span>{catName(a)}</span>
                        <span>· {t("curation.until", { when: formatWhen(ui, a.pinnedUntil) })}</span>
                      </div>
                    </div>
                    <UntilEditor
                      initial={toLocalInput(a.pinnedUntil)}
                      disabled={isBusy(a.id)}
                      saveLabel={rank === 1 ? t("curation.saveTime") : t("curation.bringToTop")}
                      onSave={(until) => void act(a.id, "pin", until)}
                      onRemove={() => void act(a.id, "unpin")}
                      removeLabel={t("curation.unpin")}
                    />
                  </li>
                );
              })}
            </ol>
            {d.pins.length === 0 && d.homepage.lead && (
              <p className="mt-2 text-sm text-muted">{t("curation.autoLead", { title: d.homepage.lead.title })}</p>
            )}
          </Panel>

          <ChoiceList
            title={t("curation.topTitle")}
            help={t("curation.topHelp")}
            items={visible(d.featured)}
            all={d.featured}
            onHomepage={(id) => (id === leadId ? "lead" : topIds.indexOf(id))}
            Title={Title}
            catName={catName}
            busy={isBusy}
            onBump={(id) => void act(id, "feature")}
            onRemove={(id) => void act(id, "unfeature")}
            filled={d.homepage.top.filter((x) => !d.featured.some((f) => f.id === x.id))}
          />

          <ChoiceList
            title={t("curation.picksTitle")}
            help={t("curation.picksHelp")}
            items={visible(d.picks)}
            all={d.picks}
            onHomepage={(id) => (id === leadId ? "lead" : topIds.includes(id) ? "top" : pickIds.indexOf(id))}
            Title={Title}
            catName={catName}
            busy={isBusy}
            onBump={(id) => void act(id, "pick")}
            onRemove={(id) => void act(id, "unpick")}
            filled={[]}
          />

          <Panel title={t("curation.breakingTitle")}>
            <p className="mb-3 text-sm text-muted">{t("curation.breakingHelp")}</p>
            {d.breaking.length === 0 && <p className="text-sm">{t("curation.noBreaking")}</p>}
            <ul className="divide-y divide-rule">
              {visible(d.breaking).map((a) => (
                <li key={a.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <Title a={a} />
                    <div className="mt-1 text-xs text-muted">
                      {catName(a)} · {t("curation.until", { when: formatWhen(ui, a.breakingUntil) })}
                    </div>
                  </div>
                  <UntilEditor
                    initial={toLocalInput(a.breakingUntil)}
                    disabled={isBusy(a.id)}
                    saveLabel={t("curation.saveTime")}
                    onSave={(until) => void act(a.id, "breaking", until)}
                    onRemove={() => void act(a.id, "endBreaking")}
                    removeLabel={t("curation.endBreaking")}
                  />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={t("curation.addTitle")}>
            <label className="block text-sm">
              {t("curation.searchStory")}
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className={field} placeholder={t("curation.searchHint")} />
            </label>
            <ul className="mt-3 divide-y divide-rule">
              {(found.data?.data ?? []).map((a) => (
                <AddRow key={a.id} a={a} cat={catName(a)} busy={isBusy(a.id)} act={act} state={{ pinned: d.pins.some((p) => p.id === a.id), featured: d.featured.some((p) => p.id === a.id), picked: d.picks.some((p) => p.id === a.id), breaking: d.breaking.some((p) => p.id === a.id) }} Title={Title} />
              ))}
            </ul>
            {search.trim().length > 1 && found.data && found.data.data.length === 0 && <p className="mt-2 text-sm text-muted">{t("curation.noResults")}</p>}
          </Panel>

          {d.notLive.length > 0 && (
            <Panel title={t("curation.notLiveTitle")}>
              <p className="mb-2 text-sm text-muted">{t("curation.notLiveHelp")}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {d.notLive.map((a) => (
                  <li key={a.id}>
                    <Title a={a} /> <span className="text-muted">({t(`status.${a.status}`)})</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

function UntilEditor({ initial, disabled, saveLabel, onSave, onRemove, removeLabel }: { initial: string; disabled: boolean; saveLabel: string; onSave: (v: string) => void; onRemove: () => void; removeLabel: string }) {
  const t = useTranslations("cms");
  const [value, setValue] = useState(initial);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs">
        <span className="sr-only">{t("curation.untilLabel")}</span>
        <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className={`${field} mt-0 w-auto`} aria-label={t("curation.untilLabel")} />
      </label>
      <button type="button" className={btn} disabled={disabled || !value} onClick={() => onSave(value)}>
        {saveLabel}
      </button>
      <button type="button" className={`${btn} border-breaking text-breaking`} disabled={disabled} onClick={onRemove}>
        {removeLabel}
      </button>
    </div>
  );
}

function ChoiceList({
  title,
  help,
  items,
  all,
  onHomepage,
  Title,
  catName,
  busy,
  onBump,
  onRemove,
  filled,
}: {
  title: string;
  help: string;
  items: Item[];
  all: Item[];
  onHomepage: (id: string) => number | "lead" | "top";
  Title: (p: { a: { id: string; title: string } }) => React.ReactNode;
  catName: (a: Item) => string;
  busy: (id: string) => boolean;
  onBump: (id: string) => void;
  onRemove: (id: string) => void;
  filled: { id: string; title: string }[];
}) {
  const t = useTranslations("cms");
  return (
    <Panel title={title}>
      <p className="mb-3 text-sm text-muted">{help}</p>
      {all.length === 0 && <p className="text-sm">{t("curation.none")}</p>}
      <ol className="divide-y divide-rule">
        {items.map((a) => {
          const rank = all.findIndex((x) => x.id === a.id) + 1;
          const place = onHomepage(a.id);
          return (
            <li key={a.id} className="grid gap-2 py-3 md:grid-cols-[3rem_1fr_auto] md:items-center">
              <span className="headline text-2xl text-muted">#{rank}</span>
              <div className="min-w-0">
                <Title a={a} />
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  {place === "lead" ? (
                    <span className={`${badge} bg-brand-soft text-ink`}>{t("curation.showingAsLead")}</span>
                  ) : place === "top" ? (
                    <span className={`${badge} bg-brand-soft text-ink`}>{t("curation.showingInTop")}</span>
                  ) : place >= 0 ? (
                    <span className={`${badge} bg-brand-soft text-ink`}>{t("curation.onHomeAt", { n: place + 1 })}</span>
                  ) : (
                    <span className={`${badge} bg-surface-2`}>{t("curation.notShown")}</span>
                  )}
                  <span>{catName(a)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {rank > 1 && (
                  <button type="button" className={btn} disabled={busy(a.id)} onClick={() => onBump(a.id)}>
                    {t("curation.bringToTop")}
                  </button>
                )}
                <button type="button" className={`${btn} border-breaking text-breaking`} disabled={busy(a.id)} onClick={() => onRemove(a.id)}>
                  {t("curation.remove")}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {filled.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          {t("curation.autoFilled")}: {filled.map((f) => f.title).join(" · ")}
        </p>
      )}
    </Panel>
  );
}

function AddRow({
  a,
  cat,
  busy,
  act,
  state,
  Title,
}: {
  a: Found;
  cat: string;
  busy: boolean;
  act: (id: string, action: string, until?: string) => Promise<void>;
  state: { pinned: boolean; featured: boolean; picked: boolean; breaking: boolean };
  Title: (p: { a: { id: string; title: string } }) => React.ReactNode;
}) {
  const t = useTranslations("cms");
  const [pinUntil, setPinUntil] = useState(inHours(24));
  const [breakUntil, setBreakUntil] = useState(inHours(3));
  return (
    <li className="py-3">
      <Title a={a} />
      <div className="mt-1 text-xs text-muted">{cat}</div>
      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <div className="flex flex-wrap items-end gap-2">
          <input type="datetime-local" value={pinUntil} onChange={(e) => setPinUntil(e.target.value)} className={`${field} mt-0 w-auto`} aria-label={t("curation.pinUntil")} />
          <button type="button" className={btnPrimary} disabled={busy || !pinUntil} onClick={() => void act(a.id, "pin", pinUntil)}>
            {state.pinned ? t("curation.bringToTop") : t("curation.pin")}
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <input type="datetime-local" value={breakUntil} onChange={(e) => setBreakUntil(e.target.value)} className={`${field} mt-0 w-auto`} aria-label={t("curation.breakingUntil")} />
          <button type="button" className={btn} disabled={busy || !breakUntil} onClick={() => void act(a.id, "breaking", breakUntil)}>
            {t("curation.makeBreaking")}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 lg:col-span-2">
          <button type="button" className={btn} disabled={busy} onClick={() => void act(a.id, "feature")}>
            {state.featured ? `${t("curation.topTitle")}: ${t("curation.bringToTop")}` : `+ ${t("curation.topTitle")}`}
          </button>
          <button type="button" className={btn} disabled={busy} onClick={() => void act(a.id, "pick")}>
            {state.picked ? `${t("curation.picksTitle")}: ${t("curation.bringToTop")}` : `+ ${t("curation.picksTitle")}`}
          </button>
        </div>
      </div>
    </li>
  );
}
