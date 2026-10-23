"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/providers";
import { ThemeToggle } from "@/components/site/header-controls";
import type { Me } from "@/lib/client-api";
import { paths } from "@/lib/urls";

export const can = (me: Me | null, permission: string) => Boolean(me?.permissions.includes(permission));

const NAV: { href: string; key: string; permission: string }[] = [
  { href: "", key: "dashboard", permission: "dashboard:read" },
  { href: "articles", key: "articles", permission: "article:create" },
  { href: "articles/new", key: "newArticle", permission: "article:create" },
  { href: "media", key: "media", permission: "media:upload" },
  { href: "calendar", key: "calendar", permission: "article:create" },
  { href: "seo", key: "seo", permission: "article:edit_any" },
  { href: "taxonomy", key: "taxonomy", permission: "article:create" },
  { href: "homepage", key: "homepage", permission: "homepage:manage" },
  { href: "pages", key: "pages", permission: "pages:manage" },
  { href: "users", key: "users", permission: "users:manage" },
  { href: "ads", key: "ads", permission: "ads:manage" },
  { href: "audit", key: "audit", permission: "audit:read" },
  { href: "profile", key: "profile", permission: "article:create" },
];

export function CmsShell({ children }: { children: ReactNode }) {
  const t = useTranslations("cms");
  const common = useTranslations("common");
  const locale = useLocale() as "bn" | "en";
  const pathname = usePathname();
  const { me, status } = useAuth();
  const staff = me && (can(me, "dashboard:read") || can(me, "ads:manage"));
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFor, setMenuFor] = useState(pathname);
  if (menuFor !== pathname) {
    // Choosing a page closes the phone menu.
    setMenuFor(pathname);
    setMenuOpen(false);
  }

  let content: ReactNode = children;
  if (status === "loading") content = <div className="skeleton h-64" aria-hidden="true" />;
  else if (status === "anonymous")
    content = (
      <div className="max-w-lg">
        <p>{t("access.signInRequired")}</p>
        <Link href={paths.login(locale, pathname)} className="mt-4 inline-flex min-h-11 items-center rounded bg-brand px-5 font-semibold text-brand-ink">
          {t("access.signIn")}
        </Link>
      </div>
    );
  else if (!staff) content = <p role="alert">{t("access.forbidden")}</p>;

  const items = NAV.filter((n) => can(me, n.permission));
  const base = paths.admin(locale);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <a href="#cms-main" className="skip-link">
        {common("skipToContent")}
      </a>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-surface px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          {staff && (
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded border border-rule-strong px-3 text-sm font-semibold md:hidden"
              aria-expanded={menuOpen}
              aria-controls="cms-nav"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
              {t("nav.menu")}
            </button>
          )}
          <Link href={base} className="headline text-xl">
            {t("title")}
          </Link>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ThemeToggle />
          <Link href={locale === "bn" ? pathname.replace(/^\/bn/, "/en") : pathname.replace(/^\/en/, "/bn")} className="inline-flex h-10 items-center rounded border border-rule-strong px-3 font-semibold">
            {locale === "bn" ? "English" : "বাংলা"}
          </Link>
          <Link href={paths.home(locale)} className="inline-flex h-10 items-center rounded border border-rule-strong px-3 font-semibold">
            {t("nav.viewSite")}
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        {staff && (
          <nav
            id="cms-nav"
            aria-label={t("title")}
            className={`${menuOpen ? "block" : "hidden"} border-b border-rule bg-surface md:block md:w-56 md:shrink-0 md:border-b-0 md:border-r`}
          >
            <ul className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3 md:flex md:flex-col">
              {items.map((n) => {
                const href = n.href ? `${base}/${n.href}` : base;
                const active = n.href === "" ? pathname === base : pathname === href || (n.href === "articles" && /\/admin\/articles\/[a-f0-9]{24}/.test(pathname));
                return (
                  <li key={n.key}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className="block rounded px-3 py-2.5 text-sm hover:bg-surface-2 aria-[current=page]:bg-brand-soft aria-[current=page]:font-semibold md:py-2"
                    >
                      {t(`nav.${n.key}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        <main id="cms-main" tabIndex={-1} className="min-w-0 flex-1 p-3 outline-none sm:p-6">
          {content}
        </main>
      </div>
    </div>
  );
}

/* ---------- Small shared CMS building blocks ---------- */

export const field = "mt-1 min-h-11 w-full rounded border border-rule-strong bg-paper px-3";
export const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded border border-rule-strong px-4 text-sm font-semibold hover:bg-surface-2 disabled:opacity-50";
export const btnPrimary = "inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand px-4 text-sm font-semibold text-brand-ink hover:opacity-90 disabled:opacity-50";

export function Panel({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-rule bg-surface p-4 sm:p-5">
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("cms.status");
  const colors: Record<string, string> = {
    draft: "bg-surface-2 text-ink-2",
    in_review: "bg-accent/20 text-ink",
    scheduled: "bg-focus/10 text-ink",
    published: "bg-brand-soft text-ink",
    archived: "bg-rule text-muted",
  };
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${colors[status] ?? ""}`}>{t(status)}</span>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded border border-breaking/40 bg-breaking/10 p-3 text-sm">
      {message}
    </p>
  );
}

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="headline text-2xl sm:text-3xl">{children}</h1>
      {actions}
    </div>
  );
}
