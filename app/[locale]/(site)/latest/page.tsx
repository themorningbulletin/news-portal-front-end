import type { Metadata } from "next";
import { LatestView, latestMetadata } from "./view";

export const ensureStatic = "navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/latest">): Promise<Metadata> {
  return latestMetadata((await params).locale, 1);
}

export default async function Page({ params }: PageProps<"/[locale]/latest">) {
  return <LatestView rawLocale={(await params).locale} page={1} />;
}
