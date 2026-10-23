import { createTranslator } from "next-intl";
import bn from "@/messages/bn.json";
import en from "@/messages/en.json";
import { TIME_ZONE, type Locale } from "./config";

export const messages = { bn, en } as const;
export type Messages = typeof en;

/**
 * Server-side translator. The locale is always passed explicitly (it comes
 * from the route), so translation never reads request headers and pages stay
 * statically renderable.
 */
export function getT<N extends keyof Messages>(locale: Locale, namespace: N) {
  return createTranslator({ locale, messages: messages[locale] as Messages, namespace, timeZone: TIME_ZONE });
}

/** Messages shipped to client components: only the namespaces they use. */
export function clientMessages(locale: Locale) {
  const m = messages[locale];
  return {
    common: m.common,
    nav: m.nav,
    theme: m.theme,
    language: m.language,
    article: m.article,
    search: m.search,
    account: m.account,
    auth: m.auth,
    newsletter: m.newsletter,
    consent: m.consent,
    ads: m.ads,
    archive: m.archive,
    errors: m.errors,
    footer: m.footer,
  };
}
