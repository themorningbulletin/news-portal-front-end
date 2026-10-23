"use client";

import Link from "next/link";
import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createBrowserValue } from "@/lib/browser-store";
import type { AdPlacement } from "@/lib/types";

/*
 * Advertising and consent. Nothing loads unless a publisher id is configured
 * and at least one placement is enabled in the CMS. Google Consent Mode
 * defaults to "denied"; personalised ads are only requested after the reader
 * explicitly accepts. For readers in the EEA, UK or Switzerland a
 * Google-certified CMP must be used instead (see docs/MONETIZATION.md).
 */

type Choice = "personalized" | "non_personalized";
const KEY = "adConsent";

interface AdsState {
  client: string | null;
  placements: Map<string, AdPlacement>;
  choice: Choice | null;
  setChoice: (c: Choice) => void;
  reopen: () => void;
}

const AdsContext = createContext<AdsState>({ client: null, placements: new Map(), choice: null, setChoice: () => {}, reopen: () => {} });
export const useAds = () => useContext(AdsContext);

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readChoice(): Choice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "personalized" || v === "non_personalized" ? v : null;
  } catch {
    return null;
  }
}

const storedChoice = createBrowserValue<Choice | null | undefined>(readChoice, undefined);

function updateConsent(choice: Choice) {
  const granted = choice === "personalized" ? "granted" : "denied";
  window.gtag?.("consent", "update", { ad_storage: granted, ad_user_data: granted, ad_personalization: granted });
  (window.adsbygoogle ??= []);
  // Non-personalised requests stay non-personalised for the rest of the visit.
  (window.adsbygoogle as unknown as { requestNonPersonalizedAds?: number }).requestNonPersonalizedAds = choice === "personalized" ? 0 : 1;
}

const consentDefaults = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});
try{var c=localStorage.getItem('adConsent');if(c==='personalized'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});}
else{(window.adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=1;}}catch(e){(window.adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=1;}`;

/** Demo mode shows labelled placeholders in every placement so layouts can be reviewed without AdSense. */
const DEMO_PLACEMENTS: AdPlacement[] = [
  { key: "header", slotId: "demo", format: "horizontal", minHeight: 90 },
  { key: "home_feed", slotId: "demo", format: "auto", minHeight: 250 },
  { key: "category_feed", slotId: "demo", format: "auto", minHeight: 250 },
  { key: "article_inline", slotId: "demo", format: "rectangle", minHeight: 250 },
  { key: "sidebar", slotId: "demo", format: "rectangle", minHeight: 250 },
  { key: "footer", slotId: "demo", format: "horizontal", minHeight: 90 },
];
const DEMO_SIZE: Record<string, string> = {
  header: "728×90 / 320×50",
  home_feed: "Responsive",
  category_feed: "Responsive",
  article_inline: "300×250 / Responsive",
  sidebar: "300×250",
  footer: "728×90 / 320×50",
};

export function AdsProvider({
  client,
  placements,
  demo = false,
  children,
}: {
  client: string | null;
  placements: AdPlacement[];
  demo?: boolean;
  children: ReactNode;
}) {
  if (demo) return <DemoAds>{children}</DemoAds>;
  return (
    <RealAds client={client} placements={placements}>
      {children}
    </RealAds>
  );
}

function DemoAds({ children }: { children: ReactNode }) {
  const value = useMemo<AdsState>(
    () => ({ client: "demo", placements: new Map(DEMO_PLACEMENTS.map((p) => [p.key, p])), choice: null, setChoice: () => {}, reopen: () => {} }),
    [],
  );
  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

function RealAds({ client, placements, children }: { client: string | null; placements: AdPlacement[]; children: ReactNode }) {
  const enabled = Boolean(client && placements.length);
  // undefined = not read yet (server render), null = reader has not chosen.
  const stored = storedChoice.use();
  const [sessionChoice, setSessionChoice] = useState<Choice | null>(null);
  const [reopened, setReopened] = useState(false);
  const choice = sessionChoice ?? stored ?? null;
  const bannerOpen = enabled && (reopened || (stored === null && sessionChoice === null));

  const setChoice = useCallback((c: Choice) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      // Not persisted; applies to this visit.
    }
    updateConsent(c);
    setSessionChoice(c);
    setReopened(false);
    storedChoice.notify();
  }, []);

  const value = useMemo<AdsState>(
    () => ({
      client: enabled ? client : null,
      placements: new Map(placements.map((p) => [p.key, p])),
      choice,
      setChoice,
      reopen: () => setReopened(true),
    }),
    [enabled, client, placements, choice, setChoice],
  );

  return (
    <AdsContext.Provider value={value}>
      {children}
      {enabled && (
        <>
          <Script id="consent-defaults" strategy="afterInteractive">
            {consentDefaults}
          </Script>
          {/* Loaded after the page is idle so it never competes with the story for bandwidth. */}
          <Script
            id="adsense"
            strategy="lazyOnload"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client!)}`}
          />
          {bannerOpen && <ConsentBanner onChoose={setChoice} />}
        </>
      )}
    </AdsContext.Provider>
  );
}

function ConsentBanner({ onChoose }: { onChoose: (c: Choice) => void }) {
  const t = useTranslations("consent");
  const locale = useLocale();
  // A non-modal bar: the page stays fully usable and both choices carry equal weight.
  return (
    <section
      role="region"
      aria-labelledby="consent-title"
      className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-surface p-4 shadow-card"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1 text-sm">
          <h2 id="consent-title" className="font-semibold">
            {t("title")}
          </h2>
          <p className="mt-1 text-ink-2">
            {t("body")}{" "}
            <Link href={`/${locale}/info/privacy`} className="text-link underline">
              {t("privacyLink")}
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={() => onChoose("non_personalized")} className="min-h-11 rounded border border-rule-strong px-4 text-sm font-semibold hover:bg-surface-2">
            {t("reject")}
          </button>
          <button type="button" onClick={() => onChoose("personalized")} className="min-h-11 rounded border border-rule-strong px-4 text-sm font-semibold hover:bg-surface-2">
            {t("accept")}
          </button>
        </div>
      </div>
    </section>
  );
}

export function ConsentSettingsLink({ label }: { label: string }) {
  const { reopen, client } = useAds();
  if (!client) return null;
  return (
    <button type="button" onClick={reopen} className="text-left hover:underline">
      {label}
    </button>
  );
}

/**
 * One ad placement. Space is reserved up front (no layout shift), the slot is
 * clearly labelled, and nothing renders when ads are not configured.
 */
export function AdSlot({ placement, className = "" }: { placement: string; className?: string }) {
  const { client, placements } = useAds();
  const t = useTranslations("ads");
  const p = placements.get(placement);
  useEffect(() => {
    if (!client || !p || client === "demo") return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Blocked or failed: the labelled, reserved box stays empty.
    }
  }, [client, p]);
  if (!client || !p) return null;
  if (client === "demo") {
    return (
      <aside aria-label={t("label")} className={`no-print my-8 ${className}`}>
        <p className="mb-1 text-center text-[0.6875rem] uppercase tracking-wider text-muted">{t("label")}</p>
        <div
          className="flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-accent/60 bg-accent/10 p-3 text-center"
          style={{ minHeight: p.minHeight }}
        >
          <span className="font-semibold text-ink-2">{t("demo")}</span>
          <span className="text-xs text-muted">
            {t(`places.${placement}`)} · {DEMO_SIZE[placement]}
          </span>
        </div>
      </aside>
    );
  }
  return (
    <aside aria-label={t("label")} className={`no-print my-8 ${className}`}>
      <p className="mb-1 text-center text-[0.6875rem] uppercase tracking-wider text-muted">{t("label")}</p>
      <div className="flex items-center justify-center overflow-hidden rounded bg-surface-2" style={{ minHeight: p.minHeight }}>
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", minHeight: p.minHeight }}
          data-ad-client={client}
          data-ad-slot={p.slotId}
          data-ad-format={p.format === "fluid" ? "fluid" : p.format}
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
