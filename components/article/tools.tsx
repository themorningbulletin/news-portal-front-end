"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers";
import { createBrowserValue, useBrowserConstant } from "@/lib/browser-store";
import { apiFetch } from "@/lib/client-api";
import { paths } from "@/lib/urls";

const btn =
  "inline-flex min-h-10 items-center gap-2 rounded border border-rule-strong px-3 text-sm font-semibold hover:bg-surface-2 aria-pressed:bg-brand-soft";

/** Thin bar fixed to the top edge: shows progress without covering any text. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const t = useTranslations("article");
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const done = total <= 0 ? (rect.top < 0 ? 1 : 0) : Math.min(1, Math.max(0, -rect.top / total));
      setPct(Math.round(done * 100));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [targetId]);
  return (
    <div
      role="progressbar"
      aria-label={t("progress")}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="no-print pointer-events-none fixed inset-x-0 top-0 z-50 h-1"
    >
      <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
    </div>
  );
}

const SIZES = ["sm", "md", "lg", "xl"] as const;
type Size = (typeof SIZES)[number];
const textSize = createBrowserValue<Size>(() => {
  const v = document.documentElement.getAttribute("data-text-size");
  return SIZES.includes(v as Size) ? (v as Size) : "md";
}, "md");

export function ReaderControls() {
  const t = useTranslations("article");
  const size = textSize.use();
  const [focus, setFocus] = useState(false);

  // Leaving the story always ends focus mode.
  useEffect(() => () => document.documentElement.removeAttribute("data-focus-mode"), []);

  const change = (delta: number) => {
    const next = SIZES[Math.min(SIZES.length - 1, Math.max(0, SIZES.indexOf(size) + delta))]!;
    document.documentElement.setAttribute("data-text-size", next);
    textSize.notify();
    try {
      localStorage.setItem("textSize", next);
    } catch {
      // Applies to this page view only.
    }
  };

  return (
    <div role="group" aria-label={t("readingTools")} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">{t("textSize")}</span>
      <button type="button" className={btn} onClick={() => change(-1)} disabled={size === "sm"} aria-label={t("smaller")}>
        A−
      </button>
      <button type="button" className={btn} onClick={() => change(1)} disabled={size === "xl"} aria-label={t("larger")}>
        A+
      </button>
      <button
        type="button"
        className={btn}
        aria-pressed={focus}
        onClick={() => {
          const next = !focus;
          setFocus(next);
          document.documentElement.setAttribute("data-focus-mode", String(next));
          if (next) document.getElementById("article-top")?.scrollIntoView();
        }}
      >
        {focus ? t("exitFocus") : t("focusMode")}
      </button>
    </div>
  );
}

export function ShareActions({ url, title }: { url: string; title: string }) {
  const t = useTranslations("article");
  const [copied, setCopied] = useState(false);
  const canShare = useBrowserConstant(() => "share" in navigator, false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canShare && (
        <button
          type="button"
          className={btn}
          onClick={() => navigator.share({ title, url }).catch(() => undefined)}
        >
          {t("shareNative")}
        </button>
      )}
      <button
        type="button"
        className={btn}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
          } catch {
            // Fallback for browsers without the async clipboard API.
            const ta = document.createElement("textarea");
            ta.value = url;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }}
      >
        {t("copyLink")}
      </button>
      <button type="button" className={btn} onClick={() => window.print()}>
        {t("print")}
      </button>
      <span role="status" className="text-sm text-brand">
        {copied ? t("copied") : ""}
      </span>
    </div>
  );
}

export function BookmarkButton({ group }: { group: string }) {
  const t = useTranslations("article");
  const locale = useLocale();
  const { status } = useAuth();
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "signed-in") return;
    let alive = true;
    apiFetch<{ data: string[] }>("/me/bookmarks/ids")
      .then((r) => alive && setSaved(r.data.includes(group)))
      .catch(() => alive && setSaved(false));
    return () => {
      alive = false;
    };
  }, [status, group]);

  if (status === "loading") return <span className="inline-block h-10 w-28" aria-hidden="true" />;
  if (status === "anonymous") {
    return (
      <Link href={paths.login(locale as "bn" | "en", typeof window !== "undefined" ? window.location.pathname : undefined)} className={btn} rel="nofollow">
        {t("saveSignIn")}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={btn}
      aria-pressed={Boolean(saved)}
      disabled={busy || saved === null}
      onClick={async () => {
        setBusy(true);
        try {
          await apiFetch(`/me/bookmarks/${group}`, { method: saved ? "DELETE" : "PUT" });
          setSaved(!saved);
        } finally {
          setBusy(false);
        }
      }}
    >
      {saved ? `✓ ${t("saved")}` : t("save")}
    </button>
  );
}

/** Counts one anonymous view per story per browser session (sessionStorage), nothing personal. */
export function ViewTracker({ id }: { id: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const key = `viewed:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Without sessionStorage we still count once per page load.
    }
    const referrer = document.referrer ? document.referrer.slice(0, 2000) : undefined;
    void fetch(`/api/v1/articles/${id}/view`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(referrer ? { referrer } : {}),
      keepalive: true,
    }).catch(() => undefined);
  }, [id]);
  return null;
}

/** Click-to-load video: nothing from the video host loads until the reader asks for it. */
export function VideoEmbed({ url, title }: { url: string; title: string }) {
  const t = useTranslations("article");
  const [play, setPlay] = useState(false);
  const embed = toEmbed(url);
  if (!embed) return null;
  return (
    <div className="no-print my-6">
      <div className="relative overflow-hidden rounded bg-ink" style={{ aspectRatio: "16/9" }}>
        {play ? (
          <iframe
            src={embed.src}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-paper">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paper/90 text-2xl text-ink" aria-hidden="true">
              ▶
            </span>
            <span className="font-semibold">{t("playVideo")}</span>
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">{t("videoNotice", { host: embed.host })}</p>
    </div>
  );
}

function toEmbed(raw: string): { src: string; host: string } | null {
  try {
    const u = new URL(raw);
    if (u.hostname === "youtu.be") return { src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(u.pathname.slice(1))}`, host: "YouTube" };
    if (u.hostname.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      return v ? { src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}`, host: "YouTube" } : null;
    }
    if (u.hostname.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id && /^\d+$/.test(id) ? { src: `https://player.vimeo.com/video/${id}?dnt=1`, host: "Vimeo" } : null;
    }
  } catch {
    return null;
  }
  return null;
}
