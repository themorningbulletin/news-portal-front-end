"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { apiFetch, ApiError } from "@/lib/client-api";

export function NewsletterForm() {
  const t = useTranslations("newsletter");
  const locale = useLocale();
  const id = useId();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "invalid">("idle");

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const email = String(form.get("email") ?? "").trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setState("invalid");
        setState("sending");
        try {
          await apiFetch("/newsletter/subscribe", { method: "POST", body: { email, locale, website: String(form.get("website") ?? "") } });
          setState("done");
        } catch (err) {
          setState(err instanceof ApiError && err.code === "validation_failed" ? "invalid" : "error");
        }
      }}
    >
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm text-ink-2">{t("intro")}</p>
      {state === "done" ? (
        <p role="status" className="mt-3 rounded bg-brand-soft p-3 text-sm">
          {t("success")}
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor={id} className="sr-only">
              {t("email")}
            </label>
            <input
              id={id}
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t("email")}
              aria-invalid={state === "invalid"}
              aria-describedby={`${id}-msg`}
              className="min-h-11 flex-1 rounded border border-rule-strong bg-paper px-3"
            />
            {/* Honeypot for bots; hidden from people and assistive technology. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <button type="submit" disabled={state === "sending"} className="min-h-11 rounded bg-brand px-4 font-semibold text-brand-ink disabled:opacity-60">
              {t("submit")}
            </button>
          </div>
          <p id={`${id}-msg`} role="status" className="mt-2 text-xs text-muted">
            {state === "invalid" ? t("invalidEmail") : state === "error" ? t("error") : t("privacyNote")}
          </p>
        </>
      )}
    </form>
  );
}
