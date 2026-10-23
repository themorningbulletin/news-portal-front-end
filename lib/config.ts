/**
 * Public configuration. Every value comes from the environment; nothing here
 * is a real credential or account id. Missing values switch features off.
 */
export const LOCALES = ["bn", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "bn";

export const isLocale = (value: string): value is Locale => (LOCALES as readonly string[]).includes(value);
export const otherLocale = (l: Locale): Locale => (l === "bn" ? "en" : "bn");

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME: Record<Locale, string> = { bn: "দ্য মর্নিং বুলেটিন", en: "The Morning Bulletin" };

/** The newsroom works in Bangladesh Standard Time. */
export const TIME_ZONE = "Asia/Dhaka";

export const INTL_LOCALE: Record<Locale, string> = { bn: "bn-BD", en: "en-GB" };

/** AdSense publisher id, e.g. "ca-pub-0000000000000000". Unset = no ads anywhere. */
export const ADSENSE_CLIENT = /^ca-pub-\d{10,20}$/.test(process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "")
  ? process.env.NEXT_PUBLIC_ADSENSE_CLIENT!
  : null;

/** Show labelled placeholder ads everywhere (for reviewing layouts before AdSense is live). */
export const DEMO_ADS = process.env.NEXT_PUBLIC_DEMO_ADS === "true";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};
export const FIREBASE_EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "";
export const authConfigured = Boolean((firebaseConfig.apiKey && firebaseConfig.projectId) || FIREBASE_EMULATOR_HOST);
