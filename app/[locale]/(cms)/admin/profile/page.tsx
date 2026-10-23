"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { btnPrimary, ErrorNote, field, PageTitle } from "@/components/cms/shell";
import { useAuth } from "@/components/providers";
import { apiFetch, ApiError } from "@/lib/client-api";

/** Staff maintain their own public byline (name, bio, author page). */
export default function ProfilePage() {
  const t = useTranslations("cms");
  const { me, refresh } = useAuth();
  const [a, setA] = useState(() => ({
    isPublic: me?.author.isPublic ?? false,
    slug: me?.author.slug ?? "",
    name: { bn: me?.author.name.bn ?? "", en: me?.author.name.en ?? "" },
    bio: { bn: me?.author.bio.bn ?? "", en: me?.author.bio.en ?? "" },
  }));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  if (!me) return null;
  return (
    <div>
      <PageTitle>{t("nav.profile")}</PageTitle>
      <form
        className="grid max-w-3xl gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setSaved(false);
          try {
            await apiFetch("/admin/users/me/author", { method: "PATCH", body: { isPublic: a.isPublic, ...(a.slug ? { slug: a.slug } : {}), name: a.name, bio: a.bio } });
            await refresh();
            setSaved(true);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : t("common.error"));
          }
        }}
      >
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="h-5 w-5" checked={a.isPublic} onChange={(e) => setA({ ...a, isPublic: e.target.checked })} />
          {t("users.bylinePublic")}
        </label>
        <label className="text-sm sm:col-span-2">
          {t("users.bylineSlug")}
          <input value={a.slug} onChange={(e) => setA({ ...a, slug: e.target.value })} className={field} />
        </label>
        {(["bn", "en"] as const).map((l) => (
          <label key={`n${l}`} className="text-sm">
            {t(l === "bn" ? "users.bylineNameBn" : "users.bylineNameEn")}
            <input lang={l} value={a.name[l]} onChange={(e) => setA({ ...a, name: { ...a.name, [l]: e.target.value } })} className={field} maxLength={120} />
          </label>
        ))}
        {(["bn", "en"] as const).map((l) => (
          <label key={`b${l}`} className="text-sm">
            {t(l === "bn" ? "users.bioBn" : "users.bioEn")}
            <textarea lang={l} rows={4} value={a.bio[l]} onChange={(e) => setA({ ...a, bio: { ...a.bio, [l]: e.target.value } })} className={`${field} py-2`} maxLength={600} />
          </label>
        ))}
        <div className="sm:col-span-2">
          <ErrorNote message={error} />
          <div className="mt-2 flex items-center gap-3">
            <button type="submit" className={btnPrimary}>
              {t("common.save")}
            </button>
            <span role="status" className="text-sm text-muted">
              {saved ? t("common.saved") : ""}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
