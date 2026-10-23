"use client";

/* eslint-disable @next/next/no-img-element -- preview of arbitrary media URLs */
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";
import type { CmsArticle, CmsMedia } from "@/components/cms/hooks";
import { apiFetch } from "@/lib/client-api";

/**
 * The story as readers would see it, rendered with the site's own styles.
 * Loaded inside an iframe by the CMS so mobile and desktop widths are real
 * viewport widths. Data comes from the authenticated admin API.
 */
function Frame() {
  const { id } = useParams<{ id: string }>();
  const theme = useSearchParams().get("theme");
  const t = useTranslations("errors");
  const [a, setA] = useState<CmsArticle | null>(null);
  const [img, setImg] = useState<CmsMedia | null>(null);
  const [loadFailed, setFailed] = useState(false);
  const failed = loadFailed || !/^[a-f0-9]{24}$/.test(id);

  useEffect(() => {
    if (theme === "dark" || theme === "light") document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!/^[a-f0-9]{24}$/.test(id)) return;
    apiFetch<{ data: CmsArticle }>(`/admin/articles/${id}`)
      .then(async (r) => {
        setA(r.data);
        if (r.data.featuredImage) setImg((await apiFetch<{ data: CmsMedia }>(`/admin/media/${r.data.featuredImage}`)).data);
      })
      .catch(() => setFailed(true));
  }, [id]);

  if (failed) return <p className="p-6">{t("errorTitle")}</p>;
  if (!a) return <div className="skeleton m-6 h-96" aria-hidden="true" />;
  const lang = a.locale;
  return (
    <main lang={lang} className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="headline text-[2rem] sm:text-[2.6rem] lg:text-5xl">{a.title}</h1>
      {a.summary && <p className="mt-4 text-lg text-ink-2 sm:text-xl">{a.summary}</p>}
      {img && (
        <figure className="mt-6">
          <div className="relative overflow-hidden bg-surface-2" style={{ aspectRatio: "16/9" }}>
            <img src={img.url} alt={a.imageAlt || img.alt[lang] || ""} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${img.focalX}% ${img.focalY}%` }} />
          </div>
          <figcaption className="mt-2 text-sm text-muted">
            {a.imageCaption || img.caption[lang]} {a.imageCredit || img.credit}
          </figcaption>
        </figure>
      )}
      {/* The admin API returns server-sanitized HTML. */}
      <div className="prose-news mt-8" dangerouslySetInnerHTML={{ __html: a.body }} />
    </main>
  );
}

export default function PreviewFramePage() {
  return (
    <Suspense fallback={null}>
      <Frame />
    </Suspense>
  );
}
