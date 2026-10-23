"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { setAlternateHref, useAlternateHref, useAuth } from "@/components/providers";
import { createBrowserValue } from "@/lib/browser-store";
import { markSignedIn, apiFetch } from "@/lib/client-api";
import { TIME_ZONE, type Locale } from "@/lib/config";
import { paths } from "@/lib/urls";

/* ---------------- Theme ---------------- */

type ThemePref = "system" | "light" | "dark";

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem("theme");
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

const themePref = createBrowserValue<ThemePref>(readPref, "system");

export function applyTheme(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", pref);
  } catch {
    // Storage unavailable: still apply for this page view.
  }
  const resolved = pref === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : pref;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-pref", pref);
  themePref.notify();
}

export function ThemeToggle() {
  const t = useTranslations("theme");
  const id = useId();
  // The inline head script already applied the theme; this only mirrors the choice in the control.
  const pref = themePref.use();
  return (
    <div className="flex items-center">
      <label htmlFor={id} className="sr-only">
        {t("label")}
      </label>
      <select
        id={id}
        value={pref}
        onChange={(e) => applyTheme(e.target.value as ThemePref)}
        className="h-10 cursor-pointer rounded border border-rule-strong bg-surface px-2 text-sm"
      >
        <option value="system">◐ {t("system")}</option>
        <option value="light">☀ {t("light")}</option>
        <option value="dark">☾ {t("dark")}</option>
      </select>
    </div>
  );
}

/* ---------------- Language ---------------- */

/** Pages call this with the URL of the same content in the other language. */
export function AlternateLink({ href }: { href: string | null }) {
  useEffect(() => {
    setAlternateHref(href);
    return () => setAlternateHref(null);
  }, [href]);
  return null;
}

export function LanguageSwitch() {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const other: Locale = locale === "bn" ? "en" : "bn";
  const alternate = useAlternateHref();
  // Without an equivalent page, go to the other edition's homepage.
  const href = alternate ?? paths.home(other);
  return (
    <Link
      href={href}
      hrefLang={other === "bn" ? "bn" : "en"}
      lang={other === "bn" ? "bn" : "en"}
      aria-label={t("switchLabel")}
      onClick={() => {
        document.cookie = `NEXT_LOCALE=${other}; path=/; max-age=31536000; samesite=lax`;
      }}
      // The label is in the other script; the system font renders it without downloading a web font.
      style={{ fontFamily: "system-ui, sans-serif" }}
      className="inline-flex h-10 items-center whitespace-nowrap rounded border border-rule-strong px-2.5 text-sm font-semibold hover:bg-surface-2 sm:px-3"
    >
      {t("switch")}
    </Link>
  );
}

/* ---------------- Account ---------------- */

export function AccountButton() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const { me, status, setMe } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cls = "inline-flex h-10 items-center whitespace-nowrap rounded px-2.5 text-sm font-semibold sm:px-3";
  if (status !== "signed-in" || !me) {
    return (
      <Link href={paths.login(locale)} className={`${cls} bg-brand text-brand-ink hover:opacity-90`} rel="nofollow">
        {t("signIn")}
      </Link>
    );
  }
  const staff = me.permissions.includes("dashboard:read") || me.permissions.includes("ads:manage");
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={`${cls} border border-rule-strong hover:bg-surface-2`}
      >
        {t("account")}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-56 rounded-md border border-rule bg-surface p-1 shadow-card">
          <p className="truncate px-3 py-2 text-xs text-muted">{me.email}</p>
          <Link role="menuitem" href={paths.account(locale)} className="block rounded px-3 py-2 text-sm hover:bg-surface-2">
            {t("account")}
          </Link>
          {staff && (
            <Link role="menuitem" href={paths.admin(locale)} className="block rounded px-3 py-2 text-sm hover:bg-surface-2">
              {t("admin")}
            </Link>
          )}
          <button
            role="menuitem"
            type="button"
            className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-surface-2"
            onClick={async () => {
              await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
              markSignedIn(false);
              setMe(null);
              setOpen(false);
            }}
          >
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Today's date ---------------- */

const noop = () => () => {};

/** Today's date depends on when the page is viewed, so it is rendered in the browser. */
export function TodayDate() {
  const locale = useLocale() as Locale;
  const text = useSyncExternalStore(
    noop,
    () =>
      new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
        timeZone: TIME_ZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    () => "",
  );
  return (
    <span className="inline-block min-w-[12ch]" suppressHydrationWarning>
      {text}
    </span>
  );
}
