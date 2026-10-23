"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useState } from "react";
import { btnPrimary, ErrorNote, field, PageTitle } from "@/components/cms/shell";
import { apiFetch, ApiError } from "@/lib/client-api";
import { paths } from "@/lib/urls";

function NewArticleForm() {
  const t = useTranslations("cms");
  const uiLocale = useLocale() as "bn" | "en";
  const router = useRouter();
  const sp = useSearchParams();
  const translationOf = sp.get("translationOf");
  const [locale, setLocale] = useState<"bn" | "en">(sp.get("locale") === "en" ? "en" : sp.get("locale") === "bn" ? "bn" : uiLocale);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="max-w-2xl space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await apiFetch<{ data: { id: string } }>("/admin/articles", {
            method: "POST",
            body: { locale, title, ...(translationOf && /^[a-f0-9]{24}$/.test(translationOf) ? { translationOf } : {}) },
          });
          router.replace(paths.admin(uiLocale, `articles/${res.data.id}`));
        } catch (err) {
          setError(err instanceof ApiError && err.status === 409 ? err.message : t("common.error"));
          setBusy(false);
        }
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold">{t("editor.language")}</legend>
        <div className="mt-2 flex gap-4">
          {(["bn", "en"] as const).map((l) => (
            <label key={l} className="flex items-center gap-2">
              <input type="radio" name="locale" value={l} checked={locale === l} onChange={() => setLocale(l)} disabled={Boolean(translationOf)} className="h-5 w-5" />
              {l === "bn" ? t("common.bangla") : t("common.english")}
            </label>
          ))}
        </div>
      </fieldset>
      {translationOf && <p className="text-sm text-muted">{t("editor.translationNote")}</p>}
      <label className="block text-sm font-semibold">
        {t("editor.headline")}
        <input lang={locale} required maxLength={220} value={title} onChange={(e) => setTitle(e.target.value)} className={`${field} headline text-xl`} />
      </label>
      <ErrorNote message={error} />
      <button type="submit" className={btnPrimary} disabled={busy || !title.trim()}>
        {t("editor.createDraft")}
      </button>
    </form>
  );
}

export default function NewArticlePage() {
  const t = useTranslations("cms");
  return (
    <div>
      <PageTitle>{t("editor.newTitle")}</PageTitle>
      <Suspense fallback={null}>
        <NewArticleForm />
      </Suspense>
    </div>
  );
}
