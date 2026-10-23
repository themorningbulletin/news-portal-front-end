import type { Metadata, Viewport } from "next";
import { Newsreader, Noto_Sans_Bengali } from "next/font/google";
import { notFound } from "next/navigation";
import { Providers } from "@/components/providers";
import { ThemeScript } from "@/components/theme-script";
import { isLocale, LOCALES, SITE_NAME, SITE_URL, type Locale } from "@/lib/config";
import { clientMessages, getT } from "@/lib/i18n";
import "../globals.css";

// Two web fonts only: Noto Sans Bengali for Bangla text and Newsreader for
// English headlines and story text. Interface text uses the system font. A font
// downloads only when a page contains characters from its unicode range, and
// nothing is preloaded so fonts never compete with the story for bandwidth;
// text renders immediately in a fallback font and swaps in.
const notoSansBengali = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-noto-sans-bengali", display: "swap", preload: false });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap", preload: false });

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f2" },
    { media: "(prefers-color-scheme: dark)", color: "#111315" },
  ],
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getT(locale, "common");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${SITE_NAME[locale]}: ${t("tagline")}`, template: `%s | ${SITE_NAME[locale]}` },
    description: t("tagline"),
    applicationName: SITE_NAME[locale],
    // Search Console ownership token, only when configured.
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
    formatDetection: { telephone: false },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;

  return (
    <html
      lang={locale === "bn" ? "bn" : "en"}
      data-theme="light"
      data-text-size="md"
      suppressHydrationWarning
      className={`${notoSansBengali.variable} ${newsreader.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <Providers locale={locale} messages={clientMessages(locale)}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
