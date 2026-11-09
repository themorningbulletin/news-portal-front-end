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

/* Share links open the network's own share page; nothing loads from them until the reader clicks. */
const shareBtn = "inline-flex min-h-10 items-center gap-2 rounded px-3.5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2";
const ICON = {
  facebook: "M14 8.5V6.6c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.6 2 14.4 2 11.8 2 10 3.6 10 6.4v2.1H7.3v3.4H10V22h4V11.9h2.8l.4-3.4Z",
  x: "M17.8 3h3l-6.6 7.5L22 21h-6.1l-4.8-6.2L5.6 21H2.6l7-8L2 3h6.2l4.3 5.7Zm-1 16.2h1.7L7.3 4.7H5.5Z",
  whatsapp: "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.6-.1 1.2Z",
};

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function ShareActions({ url, title }: { url: string; title: string }) {
  const t = useTranslations("article");
  const [copied, setCopied] = useState(false);
  const canShare = useBrowserConstant(() => "share" in navigator, false);
  const u = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  const links = [
    { key: "facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, label: t("shareFacebook"), text: t("shareShort"), color: "bg-[#1461c8]", icon: ICON.facebook },
    { key: "x", href: `https://x.com/intent/post?url=${u}&text=${text}`, label: t("shareX"), text: t("post"), color: "bg-[#111]", icon: ICON.x },
    { key: "whatsapp", href: `https://wa.me/?text=${text}%20${u}`, label: t("shareWhatsApp"), text: t("shareShort"), color: "bg-[#13773f]", icon: ICON.whatsapp },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {links.map((l) => (
        <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.label} title={l.label} className={`${shareBtn} ${l.color}`}>
          <Glyph d={l.icon} />
          <span className="hidden sm:inline">{l.text}</span>
        </a>
      ))}
      <a href={`mailto:?subject=${text}&body=${text}%0A${u}`} aria-label={t("shareEmail")} title={t("shareEmail")} className={`${shareBtn} bg-[#555b63]`}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
        <span className="hidden sm:inline">{t("email")}</span>
      </a>
      {canShare && (
        <button
          type="button"
          aria-label={t("shareNative")}
          title={t("shareNative")}
          className={`${shareBtn} bg-[#4d7c0f]`}
          onClick={() => navigator.share({ title, url }).catch(() => undefined)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="18" cy="5" r="2.5" />
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="19" r="2.5" />
            <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" />
          </svg>
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
      <button type="button" className={`${shareBtn} bg-[#1d4ed8]`} onClick={() => window.print()}>
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
