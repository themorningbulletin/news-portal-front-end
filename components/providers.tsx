"use client";

import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { apiFetch, type Me } from "@/lib/client-api";
import type { Locale } from "@/lib/config";

/* ---------------- Signed-in reader (optional) ---------------- */

interface AuthState {
  me: Me | null;
  status: "loading" | "anonymous" | "signed-in";
  refresh: () => Promise<void>;
  setMe: (me: Me | null) => void;
}

const AuthContext = createContext<AuthState>({ me: null, status: "loading", refresh: async () => {}, setMe: () => {} });
export const useAuth = () => useContext(AuthContext);

const noopSubscribe = () => () => {};

function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMeState] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
  // A non-sensitive hint cookie; null while server rendering.
  const hint = useSyncExternalStore(noopSubscribe, () => document.cookie.includes("khoka_signed_in=1"), () => null);
  const status: AuthState["status"] = me ? "signed-in" : hint === null || (hint && !checked) ? "loading" : "anonymous";

  const setMe = useCallback((value: Me | null) => {
    setMeState(value);
    setChecked(true);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: Me }>("/auth/me");
      setMe(res.data);
    } catch {
      setMe(null);
    }
  }, [setMe]);

  useEffect(() => {
    // Only ask the API when a session might exist; anonymous readers make no request.
    if (!hint) return;
    let alive = true;
    apiFetch<{ data: Me }>("/auth/me")
      .then((res) => alive && setMe(res.data))
      .catch(() => alive && setMe(null));
    return () => {
      alive = false;
    };
  }, [hint, setMe]);

  const value = useMemo(() => ({ me, status, refresh, setMe }), [me, status, refresh, setMe]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ---------------- Equivalent page in the other language ---------------- */

let alternateHref: string | null = null;
const listeners = new Set<() => void>();
export function setAlternateHref(href: string | null) {
  alternateHref = href;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useAlternateHref = () =>
  useSyncExternalStore(
    subscribe,
    () => alternateHref,
    () => null,
  );

export function Providers({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: AbstractIntlMessages;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Dhaka">
      <AuthProvider>{children}</AuthProvider>
    </NextIntlClientProvider>
  );
}

/** A nested message scope, e.g. the CMS adds its own namespace on top of the site messages. */
export function IntlScope({ locale, messages, children }: { locale: Locale; messages: AbstractIntlMessages; children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Dhaka">
      {children}
    </NextIntlClientProvider>
  );
}
