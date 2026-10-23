"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

interface MenuLink {
  href: string;
  label: string;
  sub?: boolean;
}

/**
 * The "all sections" menu. It closes when a link is chosen, after any
 * navigation, on Escape (returning focus to the button) and on a tap outside.
 */
export function SectionsMenu({
  label,
  openLabel,
  closeLabel,
  sections,
  extra,
}: {
  label: string;
  openLabel: string;
  closeLabel: string;
  sections: MenuLink[];
  extra: MenuLink[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState(pathname);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Navigating (including back/forward) always closes the menu.
  if (open && openedOn !== pathname) {
    setOpen(false);
    setOpenedOn(pathname);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const item = "block rounded px-3 py-3 text-[0.9375rem] hover:bg-surface-2";

  return (
    <div ref={wrapper} className="relative shrink-0 border-l border-rule">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpenedOn(pathname);
          setOpen((v) => !v);
        }}
        className="flex min-h-11 items-center gap-2 px-3 text-sm font-semibold"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
        <span className="hidden sm:inline">{label}</span>
        <span className="sr-only sm:hidden">{open ? closeLabel : openLabel}</span>
      </button>
      {open && (
        <div
          id={panelId}
          className="fixed inset-x-0 top-auto z-40 mt-1 max-h-[75vh] overflow-y-auto border-y border-rule bg-surface p-3 shadow-card sm:absolute sm:inset-x-auto sm:right-0 sm:w-[24rem] sm:rounded-md sm:border"
        >
          <ul className="grid grid-cols-2 gap-1">
            {sections.map((s) => (
              <li key={s.href}>
                <Link href={s.href} onClick={close} className={`${item} ${s.sub ? "pl-6 text-ink-2" : "font-semibold"}`}>
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
          <hr className="my-2 border-rule" />
          <ul className="grid grid-cols-2 gap-1">
            {extra.map((s) => (
              <li key={s.href}>
                <Link href={s.href} onClick={close} className={item}>
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
