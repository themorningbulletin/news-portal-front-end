import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountPanel } from "@/components/account/account-panel";
import { getCategories } from "@/lib/api";
import { isLocale } from "@/lib/config";
import { getT } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getT(locale, "account")("title"), robots: { index: false, follow: false } };
}

export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const categories = await getCategories(locale);
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="headline text-3xl">{getT(locale, "account")("title")}</h1>
      <AccountPanel categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }))} />
    </div>
  );
}
