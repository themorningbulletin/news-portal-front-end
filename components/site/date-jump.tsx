"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

/** Jumps to an archive day; a plain date input works with keyboard and screen readers. */
export function DateJump({ locale, label, button, max }: { locale: string; label: string; button: string; max?: string }) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) router.push(`/${locale}/archive/${value}`);
      }}
    >
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        <input
          id={id}
          type="date"
          required
          max={max}
          min="2000-01-01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 min-h-11 rounded border border-rule-strong bg-surface px-3"
        />
      </div>
      <button type="submit" className="min-h-11 rounded bg-brand px-4 font-semibold text-brand-ink">
        {button}
      </button>
    </form>
  );
}
