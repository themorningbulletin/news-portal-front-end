"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";
import { ArticleEditor } from "@/components/cms/article-editor";
import { PageTitle } from "@/components/cms/shell";

/** The full editor on one page; the draft is created on its first save. */
function NewArticle() {
  const uiLocale = useLocale() as "bn" | "en";
  const sp = useSearchParams();
  const requested = sp.get("locale");
  const locale = requested === "en" || requested === "bn" ? requested : uiLocale;
  const source = sp.get("translationOf");
  const translationOf = source && /^[a-f0-9]{24}$/.test(source) ? source : undefined;
  return <ArticleEditor key={`${locale}-${translationOf ?? ""}`} newLocale={locale} translationOf={translationOf} />;
}

export default function NewArticlePage() {
  const t = useTranslations("cms");
  return (
    <div>
      <PageTitle>{t("editor.newTitle")}</PageTitle>
      <Suspense fallback={null}>
        <NewArticle />
      </Suspense>
    </div>
  );
}
