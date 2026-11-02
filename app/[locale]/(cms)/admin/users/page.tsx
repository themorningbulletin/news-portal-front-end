"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { formatWhen, useApi } from "@/components/cms/hooks";
import { btn, btnPrimary, ErrorNote, field, PageTitle, Panel } from "@/components/cms/shell";
import { useAuth } from "@/components/providers";
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

interface RoleOption {
  key: string;
  label: string;
  /** Roles a sub-admin may not hand out. */
  managesUsers: boolean;
}

function InviteForm({ roles, onDone }: { roles: RoleOption[]; onDone: () => void }) {
  const t = useTranslations("cms");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("editor");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ resetLink: string | null; email: string } | null>(null);
  return (
    <div className="mb-6">
      <Panel title={t("users.invite")}>
        <p className="mb-3 text-sm text-muted">{t("users.inviteHelp")}</p>
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setResult(null);
            try {
              const res = await apiFetch<{ data: { resetLink: string | null } }>("/admin/users/invite", {
                method: "POST",
                body: { email, role, ...(displayName.trim() ? { displayName: displayName.trim() } : {}) },
              });
              setResult({ resetLink: res.data.resetLink, email });
              setEmail("");
              setDisplayName("");
              onDone();
            } catch (err) {
              setError(err instanceof ApiError ? err.message : t("common.error"));
            }
          }}
        >
          <label className="text-sm">
            {t("users.email")}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <label className="text-sm">
            {t("users.name")}
            <input value={displayName} maxLength={120} onChange={(e) => setDisplayName(e.target.value)} className={field} />
          </label>
          <label className="text-sm">
            {t("users.role")}
            <select value={role} onChange={(e) => setRole(e.target.value)} className={field}>
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-3">
            <button type="submit" className={btnPrimary}>
              {t("users.inviteButton")}
            </button>
          </div>
        </form>
        <ErrorNote message={error} />
        {result && (
          <div role="status" className="mt-3 rounded border border-rule p-3 text-sm">
            {result.resetLink ? (
              <>
                <p className="font-semibold">{t("users.inviteCreated", { email: result.email })}</p>
                <p className="mt-1 text-muted">{t("users.inviteLinkHelp")}</p>
                <input readOnly value={result.resetLink} aria-label={t("users.inviteLink")} onFocus={(e) => e.target.select()} className={`${field} mt-2`} />
                <button type="button" className={`${btn} mt-2`} onClick={() => void navigator.clipboard.writeText(result.resetLink!)}>
                  {t("users.copyLink")}
                </button>
              </>
            ) : (
              <p>{t("users.inviteExisting", { email: result.email })}</p>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function UserRow({ user, roles, label, onSaved }: { user: User; roles: RoleOption[]; label: (key: string) => string; onSaved: () => void }) {
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
          <span className="font-semibold break-all">{user.displayName ?? user.email}</span>
          <span className="ml-2 break-all text-sm text-muted">{user.email}</span>
        </span>
        <span className="flex items-center gap-3 text-sm">
          {label(user.role)}
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
              {!roles.some((r) => r.key === u.role) && <option value={u.role}>{label(u.role)}</option>}
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
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
  const locale = useLocale() as "bn" | "en";
  const { me } = useAuth();
  const roleList = useApi<{ data: { roles: { key: string; builtin: boolean; name: { bn?: string; en?: string }; permissions: string[] }[] } }>("/admin/roles");
  const allRoles: RoleOption[] = (roleList.data?.data.roles ?? []).map((r) => ({
    key: r.key,
    label: r.builtin ? t(`users.roles.${r.key}`) : r.name[locale] || r.name.bn || r.name.en || r.key,
    managesUsers: r.permissions.includes("users:manage"),
  }));
  const assignable = allRoles.filter((r) => me?.role === "admin" || !r.managesUsers);
  const roleLabel = (key: string) => allRoles.find((r) => r.key === key)?.label ?? key;
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
      <InviteForm roles={assignable} onDone={() => void reload()} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm sm:col-span-2">
          {t("common.search")}
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className={field} placeholder={t("users.email")} />
        </label>
        <label className="text-sm">
          {t("users.role")}
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className={field}>
            <option value="">{t("common.all")}</option>
            {allRoles.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorNote message={error ? t("common.error") : null} />
      <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface px-4">
        {(data?.data ?? []).map((u) => (
          <UserRow key={u.id} user={u} roles={assignable} label={roleLabel} onSaved={() => void reload()} />
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
