"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useAuth } from "@/components/providers";
import { apiFetch, markSignedIn, setCsrfToken, type Me } from "@/lib/client-api";
import { authConfigured } from "@/lib/config";
import { firebaseAuth } from "@/lib/firebase-client";
import { safeNext } from "@/lib/urls";

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"), `/${locale}/account`);
  const { setMe } = useAuth();
  const emailId = useId();
  const passwordId = useId();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authConfigured) return <p role="alert">{t("notConfigured")}</p>;

  async function finish(idToken: string) {
    const res = await apiFetch<{ data: Me; csrfToken: string }>("/auth/session", { method: "POST", body: { idToken } });
    setCsrfToken(res.csrfToken);
    markSignedIn(true);
    setMe(res.data);
    router.replace(next);
  }

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setError(null);
    try {
      await finish(await action());
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 min-h-11 w-full rounded border border-rule-strong bg-surface px-3";

  return (
    <div className="space-y-6">
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          run(async () => {
            const { auth, sdk } = await firebaseAuth();
            const cred = await sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider());
            const token = await cred.user.getIdToken();
            await sdk.signOut(auth);
            return token;
          })
        }
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded border border-rule-strong bg-surface font-semibold hover:bg-surface-2 disabled:opacity-60"
      >
        {t("google")}
      </button>

      <p className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-rule" />
        {t("or")}
        <span className="h-px flex-1 bg-rule" />
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const email = String(form.get("email") ?? "");
          const password = String(form.get("password") ?? "");
          void run(async () => {
            const { auth, sdk } = await firebaseAuth();
            const cred =
              mode === "signin"
                ? await sdk.signInWithEmailAndPassword(auth, email, password)
                : await sdk.createUserWithEmailAndPassword(auth, email, password);
            const token = await cred.user.getIdToken();
            await sdk.signOut(auth);
            return token;
          });
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor={emailId} className="text-sm font-semibold">
            {t("email")}
          </label>
          <input id={emailId} name="email" type="email" required autoComplete="email" className={field} />
        </div>
        <div>
          <label htmlFor={passwordId} className="text-sm font-semibold">
            {t("password")}
          </label>
          <input
            id={passwordId}
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            aria-describedby={`${passwordId}-hint`}
            className={field}
          />
          <p id={`${passwordId}-hint`} className="mt-1 text-xs text-muted">
            {t("passwordHint")}
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-breaking">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="min-h-12 w-full rounded bg-brand font-semibold text-brand-ink disabled:opacity-60">
          {busy ? t("working") : mode === "signin" ? t("signIn") : t("createAccount")}
        </button>
      </form>
      <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-sm text-link underline">
        {mode === "signin" ? t("noAccount") : t("haveAccount")}
      </button>
      <p className="text-xs text-muted">{t("privacyNote")}</p>
    </div>
  );
}
