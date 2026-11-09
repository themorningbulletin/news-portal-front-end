"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/lib/config";

/*
 * Prayer times, calculated in the browser with the adhan library (no API, nothing
 * sent anywhere). Defaults follow Bangladesh practice: the Karachi method
 * (Fajr and Isha at 18°) with the Hanafi Asr. The library loads only when the
 * panel is first opened, so it costs nothing on page load.
 */

type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
const ORDER: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

/** Divisional cities; "geo" uses the reader's own location (kept on the device). */
const CITIES: { key: string; lat: number; lng: number }[] = [
  { key: "dhaka", lat: 23.8103, lng: 90.4125 },
  { key: "chattogram", lat: 22.3569, lng: 91.7832 },
  { key: "khulna", lat: 22.8456, lng: 89.5403 },
  { key: "rajshahi", lat: 24.3745, lng: 88.6042 },
  { key: "sylhet", lat: 24.8949, lng: 91.8687 },
  { key: "barishal", lat: 22.701, lng: 90.3535 },
  { key: "rangpur", lat: 25.7439, lng: 89.2752 },
  { key: "mymensingh", lat: 24.7471, lng: 90.4203 },
];
const STORE = "prayerPlace";
const DHAKA_TZ = "Asia/Dhaka";

type Place = { key: string; lat: number; lng: number; tz: string };
type Day = { times: Record<PrayerKey, Date>; tomorrowFajr: Date; friday: boolean };

const loadPlace = (): Place => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as Place | null;
    if (saved && typeof saved.lat === "number" && typeof saved.lng === "number" && typeof saved.tz === "string") return saved;
  } catch {
    // Fall back to Dhaka.
  }
  return { ...CITIES[0]!, tz: DHAKA_TZ };
};

/** The calendar day in the place's own time zone, as local-midnight Dates for adhan. */
function dayParts(tz: string, offsetDays = 0) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  return new Date(y!, m! - 1, d! + offsetDays);
}

async function calculate(place: Place): Promise<Day> {
  const { CalculationMethod, Coordinates, Madhab, PrayerTimes } = await import("adhan");
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;
  const coords = new Coordinates(place.lat, place.lng);
  const today = new PrayerTimes(coords, dayParts(place.tz), params);
  const tomorrow = new PrayerTimes(coords, dayParts(place.tz, 1), params);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: place.tz, weekday: "short" }).format(new Date());
  return {
    times: { fajr: today.fajr, sunrise: today.sunrise, dhuhr: today.dhuhr, asr: today.asr, maghrib: today.maghrib, isha: today.isha },
    tomorrowFajr: tomorrow.fajr,
    friday: weekday === "Fri",
  };
}

const intlLocale = (l: Locale) => (l === "bn" ? "bn-BD" : "en-GB");

function MosqueIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5v2" />
      <path d="M7 11a5 5 0 0 1 10 0" />
      <path d="M5 21V11h14v10" />
      <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
      <path d="M2.5 21V13M21.5 21V13M2 21h20" />
    </svg>
  );
}

export function PrayerTimes() {
  const t = useTranslations("prayer");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [day, setDay] = useState<Day | null>(null);
  // The clock is read only once the panel opens (never during the server render).
  const [now, setNow] = useState(0);
  const [geoError, setGeoError] = useState(false);
  const panelId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // First open: read the saved place (browser only).
  const toggle = () => {
    if (!place) setPlace(loadPlace());
    setNow(Date.now());
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!place) return;
    let alive = true;
    calculate(place).then((d) => alive && setDay(d)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [place]);

  // While open: keep the countdown fresh, close on Escape or a tap outside.
  useEffect(() => {
    if (!open) return;
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    panel.current?.focus();
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const choose = (next: Place) => {
    setPlace(next);
    setDay(null);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {
      // Remembered for this page only.
    }
  };

  const locateMe = () => {
    setGeoError(false);
    if (!("geolocation" in navigator)) return setGeoError(true);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        choose({
          key: "geo",
          lat: Math.round(pos.coords.latitude * 1000) / 1000,
          lng: Math.round(pos.coords.longitude * 1000) / 1000,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone || DHAKA_TZ,
        }),
      () => setGeoError(true),
      { maximumAge: 3_600_000, timeout: 15_000 },
    );
  };

  const tz = place?.tz ?? DHAKA_TZ;
  // Bangla readers know the time of day from the prayer's name, so no AM/PM there.
  const time = (d: Date) =>
    new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true })
      .formatToParts(d)
      .filter((part) => locale !== "bn" || part.type !== "dayPeriod")
      .map((part) => part.value)
      .join("")
      .trim();
  const today = new Date(now);
  const dateLine = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(today);
  let hijri = "";
  try {
    const parts = new Intl.DateTimeFormat(`${intlLocale(locale)}-u-ca-islamic-umalqura`, { timeZone: tz, day: "numeric", month: "long", year: "numeric" }).formatToParts(today);
    const part = (type: string) => parts.find((x) => x.type === type)?.value ?? "";
    hijri = `${part("day")} ${part("month")} ${part("year")} ${t("hijri")}`;
  } catch {
    // Older browsers without the Islamic calendar: show the Gregorian date only.
  }

  // The next prayer (sunrise is shown but is not a prayer) and the one in progress.
  const prayers = ORDER.filter((k) => k !== "sunrise");
  const upcoming = day ? prayers.find((k) => day.times[k].getTime() > now) : undefined;
  const nextAt = day ? (upcoming ? day.times[upcoming] : day.tomorrowFajr) : null;
  const nextKey: PrayerKey = upcoming ?? "fajr";
  const current = day
    ? [...prayers].reverse().find((k) => day.times[k].getTime() <= now && !(k === "fajr" && day.times.sunrise.getTime() <= now))
    : undefined;
  const left = nextAt ? Math.max(0, Math.round((nextAt.getTime() - now) / 60_000)) : 0;
  const num = (n: number) => new Intl.NumberFormat(intlLocale(locale)).format(n);
  const remaining = left >= 60 ? t("leftHours", { h: num(Math.floor(left / 60)), m: num(left % 60) }) : t("leftMinutes", { m: num(left) });
  const label = (k: PrayerKey) => (k === "dhuhr" && day?.friday ? t("jumuah") : t(`names.${k}`));

  return (
    <div className="no-print focus-hide">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="fixed right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-3.5 text-brand-ink shadow-card transition hover:opacity-95 bottom-[calc(var(--sticky-ad-space-sm,0px)+1rem)] sm:bottom-[calc(var(--sticky-ad-space,0px)+1rem)] sm:px-4"
      >
        <MosqueIcon className="h-6 w-6" />
        <span className="hidden text-sm font-semibold sm:inline">{t("button")}</span>
        <span className="sr-only sm:hidden">{t("button")}</span>
      </button>

      {open && (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label={t("title")}
          tabIndex={-1}
          className="fixed right-4 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-rule bg-surface shadow-card outline-none bottom-[calc(var(--sticky-ad-space-sm,0px)+4.5rem)] sm:bottom-[calc(var(--sticky-ad-space,0px)+4.5rem)]"
        >
          <div className="bg-brand px-4 pb-4 pt-3 text-brand-ink">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="headline text-lg">{t("title")}</p>
                <p className="text-xs opacity-90">{dateLine}</p>
                {hijri && <p className="text-xs opacity-90">{hijri}</p>}
              </div>
              <button
                type="button"
                aria-label={t("close")}
                onClick={() => {
                  setOpen(false);
                  button.current?.focus();
                }}
                className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl hover:bg-white/15"
              >
                ×
              </button>
            </div>
            {day && nextAt && (
              <p className="mt-3 rounded-lg bg-white/15 px-3 py-2 text-sm" aria-live="polite">
                <span className="font-semibold">
                  {t("next")}: {label(nextKey)} {time(nextAt)}
                </span>
                <span className="block text-xs opacity-90">{remaining}</span>
              </p>
            )}
          </div>

          <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-3">
            <label className="mb-3 block text-xs text-muted">
              {t("place")}
              <select
                value={place?.key ?? "dhaka"}
                onChange={(e) => {
                  if (e.target.value === "geo") return locateMe();
                  const c = CITIES.find((x) => x.key === e.target.value);
                  if (c) choose({ ...c, tz: DHAKA_TZ });
                }}
                className="mt-1 block min-h-10 w-full rounded border border-rule-strong bg-paper px-2 text-sm text-ink"
              >
                {CITIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {t(`cities.${c.key}`)}
                  </option>
                ))}
                <option value="geo">{t("myLocation")}</option>
              </select>
            </label>
            {geoError && <p className="mb-2 text-xs text-breaking">{t("geoError")}</p>}

            {!day ? (
              <div className="skeleton h-56 rounded" aria-hidden="true" />
            ) : (
              <ul className="divide-y divide-rule rounded-lg border border-rule">
                {ORDER.map((k) => {
                  const isNext = k === nextKey && Boolean(upcoming);
                  const isNow = k === current;
                  return (
                    <li
                      key={k}
                      className={`flex items-center justify-between px-3 py-2.5 ${isNext ? "bg-brand-soft" : ""} ${k === "sunrise" ? "text-muted" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`font-semibold ${k === "sunrise" ? "font-normal" : ""}`}>{label(k)}</span>
                        {isNow && <span className="rounded-full bg-brand px-2 py-0.5 text-[0.6875rem] font-semibold text-brand-ink">{t("now")}</span>}
                        {isNext && <span className="rounded-full border border-brand px-2 py-0.5 text-[0.6875rem] font-semibold text-brand">{t("nextShort")}</span>}
                      </span>
                      <span className="tabular-nums">{time(day.times[k])}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {day && (
              <p className="mt-3 text-xs text-muted">
                {t("sehriIftar", { sehri: time(day.times.fajr), iftar: time(day.times.maghrib) })}
              </p>
            )}
            <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">{t("method")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
