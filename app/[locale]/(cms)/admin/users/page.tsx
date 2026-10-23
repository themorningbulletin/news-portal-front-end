"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { formatWhen, useApi } from "@/components/cms/hooks";
import { btn, btnPrimary, ErrorNote, field, PageTitle } from "@/components/cms/shell";
import { apiFetch, ApiError } from "@/lib/client-api";

interface User {
  id: string;
  email?: string;
  displayName?: string;
  role: string;
  canPublish: boolean;
  disabled: boolean;
  lastLoginAt?: string;
  author?: { isPublic?: boolean; slug?: string; name?: { bn?: string; en?: string }; bio?: { bn?: string; en?: string } };
}

const ROLES = ["reader", "author", "editor", "admin", "ad_manager", "moderator"];

function UserRow({ user, onSaved }: { user: User; onSaved: () => void }) {
  const t = useTranslations("cms");
  const locale = useLocale();
  const [u, setU] = useState(user);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          <span className="font-semibold">{user.displayName ?? user.email}</span>
          <span className="ml-2 text-sm text-muted">{user.email}</span>
        </span>
        <span className="flex items-center gap-3 text-sm">
          {t(`users.roles.${user.role}`)}
          {user.disabled && <span className="text-breaking">{t("users.disabled")}</span>}
          <span className="text-muted">{formatWhen(locale, user.lastLoginAt)}</span>
          <button type="button" className="text-link underline" aria-expanded={open} onClick={() => setOpen(!open)}>
            {t("common.edit")}
          </button>
        </span>
      </div>
      {open && (
        <form
          className="mt-3 grid gap-3 rounded border border-rule p-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSaved(false);
            try {
              await apiFetch(`/admin/users/${u.id}`, {
                method: "PATCH",
                body: {
                  role: u.role,
                  canPublish: u.canPublish,
                  disabled: u.disabled,
                  author: {
                    isPublic: Boolean(u.author?.isPublic),
                    ...(u.author?.slug ? { slug: u.author.slug } : {}),
                    name: { bn: u.author?.name?.bn ?? "", en: u.author?.name?.en ?? "" },
                    bio: { bn: u.author?.bio?.bn ?? "", en: u.author?.bio?.en ?? "" },
                  },
                },
              });
              setSaved(true);
              onSaved();
            } catch (err) {
              setError(err instanceof ApiError ? err.message : t("common.error"));
            }
          }}
        >
          <label className="text-sm">
            {t("users.role")}
            <select value={u.role} onChange={(e) => setU({ ...u, role: e.target.value })} className={field}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`users.roles.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2 pt-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-5 w-5" checked={u.canPublish} onChange={(e) => setU({ ...u, canPublish: e.target.checked })} />
              {t("users.canPublish")}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-5 w-5" checked={u.disabled} onChange={(e) => setU({ ...u, disabled: e.target.checked })} />
              {t("users.disabled")}
            </label>
          </div>
          <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-semibold">{t("users.byline")}</legend>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" className="h-5 w-5" checked={Boolean(u.author?.isPublic)} onChange={(e) => setU({ ...u, author: { ...u.author, isPublic: e.target.checked } })} />
              {t("users.bylinePublic")}
            </label>
            <label className="text-sm">
              {t("users.bylineSlug")}
              <input value={u.author?.slug ?? ""} onChange={(e) => setU({ ...u, author: { ...u.author, slug: e.target.value } })} className={field} />
            </label>
            <span />
            {(["bn", "en"] as const).map((l) => (
              <label key={`n${l}`} className="text-sm">
                {t(l === "bn" ? "users.bylineNameBn" : "users.bylineNameEn")}
                <input lang={l} value={u.author?.name?.[l] ?? ""} onChange={(e) => setU({ ...u, author: { ...u.author, name: { ...u.author?.name, [l]: e.target.value } } })} className={field} />
              </label>
            ))}
            {(["bn", "en"] as const).map((l) => (
              <label key={`b${l}`} className="text-sm">
                {t(l === "bn" ? "users.bioBn" : "users.bioEn")}
                <textarea lang={l} rows={2} value={u.author?.bio?.[l] ?? ""} onChange={(e) => setU({ ...u, author: { ...u.author, bio: { ...u.author?.bio, [l]: e.target.value } } })} className={`${field} py-2`} />
              </label>
            ))}
          </fieldset>
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
      )}
    </li>
  );
}

export default function UsersPage() {
  const t = useTranslations("cms");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: "25" });
  if (q) params.set("q", q);
  if (role) params.set("role", role);
  const { data, error, reload } = useApi<{ data: User[]; meta: { totalPages: number } }>(`/admin/users?${params}`);
  return (
    <div>
      <PageTitle>{t("nav.users")}</PageTitle>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm sm:col-span-2">
          {t("common.search")}
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className={field} placeholder={t("users.email")} />
        </label>
        <label className="text-sm">
          {t("users.role")}
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className={field}>
            <option value="">{t("common.all")}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`users.roles.${r}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorNote message={error ? t("common.error") : null} />
      <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface px-4">
        {(data?.data ?? []).map((u) => (
          <UserRow key={u.id} user={u} onSaved={() => void reload()} />
        ))}
      </ul>
      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex justify-between">
          <button type="button" className={btn} disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ←
          </button>
          <button type="button" className={btn} disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>
            →
          </button>
        </div>
      )}
    </div>
  );
}
