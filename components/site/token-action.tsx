"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { apiFetch } from "@/lib/client-api";

/**
 * Newsletter confirm/unsubscribe. The action needs a button press, so email
 * security scanners that pre-fetch links cannot act on the reader's behalf.
 */
export function TokenAction({ kind }: { kind: "confirm" | "unsubscribe" }) {
  const t = useTranslations("newsletter");
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"idle" | "busy" | "done" | "invalid">(/^[A-Za-z0-9_-]{40,60}$/.test(token) ? "idle" : "invalid");
  if (state === "invalid") return <p role="alert" className="text-breaking">{t("invalidLink")}</p>;
  if (state === "done") return <p role="status" className="rounded bg-brand-soft p-4">{kind === "confirm" ? t("confirmed") : t("unsubscribed")}</p>;
  return (
    <div>
      <p className="text-ink-2">{kind === "confirm" ? t("confirmIntro") : t("unsubIntro")}</p>
      <button
        type="button"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          try {
            await apiFetch(`/newsletter/${kind}`, { method: "POST", body: { token } });
            setState("done");
          } catch {
            setState("invalid");
          }
        }}
        className="mt-6 min-h-11 rounded bg-brand px-5 font-semibold text-brand-ink disabled:opacity-60"
      >
        {kind === "confirm" ? t("confirmButton") : t("unsubButton")}
      </button>
    </div>
  );
}
