"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useAuth } from "@/components/providers";
import { apiFetch, markSignedIn, setCsrfToken, type Me } from "@/lib/client-api";
import { authConfigured } from "@/lib/config";
import { firebaseAuth } from "@/lib/firebase-client";
import { safeNext } from "@/lib/urls";

type Mode = "signin" | "signup" | "reset";

/** Firebase error codes worth telling apart; anything else gets the general message. */
const ERROR_KEYS: Record<string, string> = {
  "auth/invalid-credential": "errorCredentials",
  "auth/wrong-password": "errorCredentials",
  "auth/user-not-found": "errorCredentials",
  "auth/invalid-email": "errorEmail",
  "auth/email-already-in-use": "errorInUse",
  "auth/weak-password": "errorWeak",
  "auth/too-many-requests": "errorTooMany",
  "auth/user-disabled": "errorDisabled",
  "auth/popup-closed-by-user": "errorPopupClosed",
};
const errorKey = (err: unknown) => ERROR_KEYS[(err as { code?: string })?.code ?? ""] ?? "error";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M3 3l18 18" />}
    </svg>
  );
}

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"), `/${locale}/account`);
  const { setMe } = useAuth();
  const emailId = useId();
  const passwordId = useId();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");

  if (!authConfigured) return <p role="alert">{t("notConfigured")}</p>;

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

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
    setNotice(null);
    try {
      await finish(await action());
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  }

  /** Firebase emails the reset link and hosts the page for choosing a new password; it then returns here. */
  async function sendReset() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { auth, sdk } = await firebaseAuth();
      auth.languageCode = locale;
      await sdk.sendPasswordResetEmail(auth, email.trim(), { url: `${window.location.origin}/${locale}/login` });
      // The same message whether or not the address has an account, so nobody can probe for accounts.
      setNotice(t("resetSent", { email: email.trim() }));
    } catch (err) {
      const key = errorKey(err);
      if (key === "errorCredentials") setNotice(t("resetSent", { email: email.trim() }));
      else setError(t(key === "error" ? "resetError" : key));
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 min-h-11 w-full rounded border border-rule-strong bg-surface px-3";

  return (
    <div className="space-y-6">
      {mode !== "reset" && (
        <>
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
        </>
      )}

      {mode === "reset" && (
        <div>
          <h2 className="text-lg font-semibold">{t("resetTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("resetIntro")}</p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "reset") {
            void sendReset();
            return;
          }
          const password = String(new FormData(e.currentTarget).get("password") ?? "");
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
          <input id={emailId} name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </div>
        {mode !== "reset" && (
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={passwordId} className="text-sm font-semibold">
                {t("password")}
              </label>
              {mode === "signin" && (
                <button type="button" onClick={() => switchTo("reset")} className="text-sm text-link underline">
                  {t("forgot")}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                aria-describedby={`${passwordId}-hint`}
                className={`${field} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-controls={passwordId}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                title={showPassword ? t("hidePassword") : t("showPassword")}
                className="absolute inset-y-0 right-0 mt-1 flex w-11 items-center justify-center rounded-r text-muted hover:text-ink"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            <p id={`${passwordId}-hint`} className="mt-1 text-xs text-muted">
              {t("passwordHint")}
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-breaking">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded border border-rule bg-surface-2 p-3 text-sm">
            {notice}
          </p>
        )}
        <button type="submit" disabled={busy} className="min-h-12 w-full rounded bg-brand font-semibold text-brand-ink disabled:opacity-60">
          {busy ? t("working") : mode === "signin" ? t("signIn") : mode === "signup" ? t("createAccount") : t("resetSend")}
        </button>
      </form>
      {mode === "reset" ? (
        <button type="button" onClick={() => switchTo("signin")} className="text-sm text-link underline">
          {t("backToSignIn")}
        </button>
      ) : (
        <button type="button" onClick={() => switchTo(mode === "signin" ? "signup" : "signin")} className="text-sm text-link underline">
          {mode === "signin" ? t("noAccount") : t("haveAccount")}
        </button>
      )}
      <p className="text-xs text-muted">{t("privacyNote")}</p>
    </div>
  );
}
