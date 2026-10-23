import { INTL_LOCALE, TIME_ZONE, type Locale } from "./config";

/*
 * All dates are rendered in the newsroom's time zone (Asia/Dhaka) with fixed
 * options, so the server and the browser always produce identical text and
 * there is no hydration mismatch or flash.
 */

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const toBnDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]!);
export const localizeDigits = (locale: Locale, value: number | string) =>
  locale === "bn" ? toBnDigits(String(value)) : String(value);

function dhakaParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

/** Bangla time-of-day words read more naturally than AM/PM. */
function bnPeriod(hour: number): string {
  if (hour >= 4 && hour < 6) return "ভোর";
  if (hour >= 6 && hour < 12) return "সকাল";
  if (hour >= 12 && hour < 15) return "দুপুর";
  if (hour >= 15 && hour < 18) return "বিকেল";
  if (hour >= 18 && hour < 20) return "সন্ধ্যা";
  return "রাত";
}

export function formatDate(locale: Locale, iso: string, style: "long" | "medium" = "long"): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: TIME_ZONE, dateStyle: style }).format(new Date(iso));
}

export function formatTime(locale: Locale, iso: string): string {
  const { hour, minute } = dhakaParts(new Date(iso));
  const mm = String(minute).padStart(2, "0");
  if (locale === "bn") {
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${bnPeriod(hour)} ${toBnDigits(`${h12}:${mm}`)}`;
  }
  return `${String(hour).padStart(2, "0")}:${mm}`;
}

export function formatDateTime(locale: Locale, iso: string): string {
  return `${formatDate(locale, iso)}, ${formatTime(locale, iso)}`;
}

/** YYYY-MM-DD of the newsroom day an instant falls on. */
export function dhakaDay(iso: string): string {
  const { year, month, day } = dhakaParts(new Date(iso));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDay(locale: Locale, day: string): string {
  return formatDate(locale, `${day}T12:00:00+06:00`);
}

export function formatMonth(locale: Locale, year: number, month: number): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: TIME_ZONE, year: "numeric", month: "long" }).format(
    new Date(`${year}-${String(month).padStart(2, "0")}-15T12:00:00+06:00`),
  );
}

export function formatNumber(locale: Locale, n: number): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(n);
}
