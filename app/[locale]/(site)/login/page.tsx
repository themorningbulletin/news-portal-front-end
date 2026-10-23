import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/account/login-form";
import { isLocale } from "@/lib/config";
import { getT } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getT(locale, "auth")("title"), robots: { index: false, follow: false } };
}

export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale, "auth");
  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="headline text-3xl">{t("title")}</h1>
      <p className="mt-2 text-ink-2">{t("intro")}</p>
      <div className="mt-8">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
