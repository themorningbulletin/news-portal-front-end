"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";

/**
 * A section in the menu bar with its subsections underneath (large screens only;
 * phones use the "All sections" menu). Opens on hover or keyboard focus, and
 * closes when a subsection is chosen, after any navigation, on Escape, and when
 * the pointer or focus leaves.
 */
export function NavDropdown({ href, label, items }: { href: string; label: string; items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState(pathname);
  const wrapper = useRef<HTMLLIElement>(null);
  const top = useRef<HTMLAnchorElement>(null);
  const listId = useId();

  // Navigating (a click, back/forward) always closes it.
  if (open && openedOn !== pathname) {
    setOpen(false);
    setOpenedOn(pathname);
  }
  const show = () => {
    setOpenedOn(pathname);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    // Drop focus from the chosen link so the menu does not reopen through keyboard focus.
    if (wrapper.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
  };

  return (
    <li
      ref={wrapper}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      onFocus={show}
      onBlur={(e) => {
        if (!wrapper.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          top.current?.focus();
        }
      }}
    >
      <Link
        ref={top}
        href={href}
        onClick={close}
        aria-controls={listId}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded px-3 text-[0.9375rem] hover:bg-surface-2"
      >
        {label}
        <svg aria-hidden="true" viewBox="0 0 24 24" className="hidden h-3.5 w-3.5 text-muted lg:block" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Link>
      <ul id={listId} className={`absolute left-0 top-full z-40 min-w-52 rounded-md border border-rule bg-surface p-1 shadow-card ${open ? "hidden lg:block" : "hidden"}`}>
        {items.map((sub) => (
          <li key={sub.href}>
            <Link href={sub.href} onClick={close} className="block whitespace-nowrap rounded px-3 py-2.5 text-[0.9375rem] hover:bg-surface-2">
              {sub.label}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}
