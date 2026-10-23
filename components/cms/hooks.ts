"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/client-api";

/** Loads JSON from the API and exposes loading/error state plus a reload function. */
export function useApi<T>(path: string | null) {
  const [result, setResult] = useState<{ path: string | null; data: T | null; error: ApiError | null }>({ path: null, data: null, error: null });

  useEffect(() => {
    if (!path) return;
    let alive = true;
    apiFetch<T>(path)
      .then((data) => alive && setResult({ path, data, error: null }))
      .catch((err) => alive && setResult((r) => ({ path, data: r.data, error: err instanceof ApiError ? err : new ApiError(0, "network", String(err)) })));
    return () => {
      alive = false;
    };
  }, [path]);

  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setResult({ path, data: await apiFetch<T>(path), error: null });
    } catch (err) {
      setResult((r) => ({ ...r, path, error: err instanceof ApiError ? err : new ApiError(0, "network", String(err)) }));
    }
  }, [path]);

  const setData = useCallback((update: (d: T | null) => T | null) => setResult((r) => ({ ...r, data: update(r.data) })), []);

  return { data: result.data, error: result.error, loading: Boolean(path) && result.path !== path, reload, setData };
}

export interface CmsCategory {
  id: string;
  name: { bn: string; en: string };
  slug: { bn: string; en: string };
  description?: { bn?: string; en?: string };
  parent: string | null;
  order: number;
  isActive: boolean;
  articleCount: number;
}

export interface CmsTag {
  id: string;
  name: { bn?: string; en?: string };
  slug: { bn?: string; en?: string };
}

export interface CmsMedia {
  id: string;
  provider: "cloudinary" | "static";
  url: string;
  width: number;
  height: number;
  alt: { bn?: string; en?: string };
  caption: { bn?: string; en?: string };
  credit?: string;
  focalX: number;
  focalY: number;
  usageCount: number;
  createdAt: string;
}

export interface CmsStaff {
  id: string;
  displayName?: string;
  role: string;
  author?: { name?: { bn?: string; en?: string }; slug?: string };
}

export interface CmsArticle {
  id: string;
  locale: "bn" | "en";
  translationGroup: string;
  status: "draft" | "in_review" | "scheduled" | "published" | "archived";
  format: "standard" | "explainer" | "opinion" | "photo" | "video";
  title: string;
  slug: string;
  previousSlugs: string[];
  summary: string;
  body: string;
  category: string | null;
  tags: string[];
  authors: string[];
  featuredImage: string | null;
  imageAlt?: string;
  imageCaption?: string;
  imageCredit?: string;
  videoUrl?: string | null;
  seo: { title?: string; description?: string; canonicalUrl?: string | null; socialImage?: string | null; focusKeyword?: string | null };
  stats?: { views7: number; views30: number };
  isFeatured: boolean;
  isEditorsPick: boolean;
  pinnedUntil: string | null;
  breakingUntil: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
  contentUpdatedAt: string | null;
  editorialNotes: { _id: string; author: string; text: string; createdAt: string }[];
  version: number;
  updatedAt: string;
  translations: { id: string; locale: "bn" | "en"; slug: string; title: string; status: string }[];
  checklist: { id: string; ok: boolean; blocking: boolean }[];
  permissions: { canEdit: boolean; canPublish: boolean; canCurate: boolean; actions: string[] };
}

export const staffName = (s: CmsStaff, locale: "bn" | "en") =>
  s.author?.name?.[locale] || s.author?.name?.[locale === "bn" ? "en" : "bn"] || s.displayName || s.id;

/** <input type="datetime-local"> works in local time; the API stores ISO instants. */
export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

export const formatWhen = (locale: string, iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { dateStyle: "medium", timeStyle: "short", hourCycle: "h23", timeZone: "Asia/Dhaka" }).format(new Date(iso)) : "—";
