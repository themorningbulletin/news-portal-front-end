"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useApi } from "@/components/cms/hooks";
import { btn, btnPrimary, ErrorNote, field, PageTitle, Panel } from "@/components/cms/shell";
import { apiFetch, ApiError } from "@/lib/client-api";

interface RoleRow {
  key: string;
  builtin: boolean;
  locked: boolean;
  customized: boolean;
  name: { bn?: string; en?: string };
  permissions: string[];
  userCount: number;
}
interface PermissionRow {
  key: string;
  adminOnly: boolean;
}

const GROUPS: { key: string; permissions: string[] }[] = [
  { key: "content", permissions: ["article:create", "article:edit_any", "article:publish", "article:delete"] },
  { key: "site", permissions: ["homepage:manage", "taxonomy:manage", "pages:manage"] },
  { key: "media", permissions: ["media:upload", "media:manage_any"] },
  { key: "business", permissions: ["dashboard:read", "newsletter:read", "ads:manage"] },
  { key: "people", permissions: ["users:manage", "audit:read", "roles:manage"] },
];
const permKey = (p: string) => p.replace(":", "_");

function PermissionPicker({ value, onChange, catalog, disabled, idPrefix }: { value: string[]; onChange: (v: string[]) => void; catalog: PermissionRow[]; disabled: boolean; idPrefix: string }) {
  const t = useTranslations("cms.roles");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {GROUPS.map((g) => (
        <fieldset key={g.key} className="min-w-0">
          <legend className="mb-1 text-sm font-semibold">{t(`groups.${g.key}`)}</legend>
          <ul className="space-y-1">
            {g.permissions.map((p) => {
              const locked = catalog.find((c) => c.key === p)?.adminOnly ?? false;
              return (
                <li key={p}>
                  <label htmlFor={`${idPrefix}-${p}`} className="flex items-start gap-2 text-sm">
                    <input
                      id={`${idPrefix}-${p}`}
                      type="checkbox"
                      className="mt-0.5 h-5 w-5 shrink-0"
                      checked={value.includes(p)}
                      disabled={disabled || locked}
                      onChange={(e) => onChange(e.target.checked ? [...value, p] : value.filter((x) => x !== p))}
                    />
                    <span>
                      {t(`perm.${permKey(p)}`)}
                      {locked && <span className="ml-1 text-xs text-muted">({t("adminOnly")})</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}

function RoleCard({ role, catalog, label, onChanged }: { role: RoleRow; catalog: PermissionRow[]; label: string; onChanged: () => Promise<unknown> }) {
  const t = useTranslations("cms");
  const [open, setOpen] = useState(false);
  const [permissions, setPermissions] = useState(role.permissions);
  const [name, setName] = useState(role.name);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    setSaved(false);
    try {
      await action();
      await onChanged();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    }
  };
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="font-semibold break-words">{label}</span>
          <span className="ml-2 text-sm text-muted">{t("roles.people", { count: role.userCount })}</span>
          {!role.builtin && <span className="ml-2 rounded bg-surface-2 px-2 py-0.5 text-xs">{t("roles.custom")}</span>}
          {role.customized && <span className="ml-2 rounded bg-surface-2 px-2 py-0.5 text-xs">{t("roles.changed")}</span>}
        </span>
        <button type="button" className="text-sm text-link underline" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? t("common.close") : role.locked ? t("roles.view") : t("common.edit")}
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">{role.builtin ? t(`roles.about.${role.key}`) : t("roles.about.custom", { count: role.permissions.length })}</p>
      {open && (
        <div className="mt-3 rounded border border-rule p-3">
          {role.locked && <p className="mb-3 text-sm text-muted">{t("roles.lockedNote")}</p>}
          {!role.builtin && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {(["bn", "en"] as const).map((l) => (
                <label key={l} className="text-sm">
                  {t(l === "bn" ? "roles.nameBn" : "roles.nameEn")}
                  <input lang={l} value={name[l] ?? ""} maxLength={60} onChange={(e) => setName({ ...name, [l]: e.target.value })} className={field} />
                </label>
              ))}
            </div>
          )}
          <PermissionPicker value={permissions} onChange={setPermissions} catalog={catalog} disabled={role.locked} idPrefix={role.key} />
          <ErrorNote message={error} />
          {!role.locked && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className={btnPrimary} onClick={() => void run(() => apiFetch(`/admin/roles/${role.key}`, { method: "PUT", body: { permissions, ...(role.builtin ? {} : { name }) } }))}>
                {t("common.save")}
              </button>
              {role.customized && (
                <button
                  type="button"
                  className={btn}
                  onClick={() => {
                    if (window.confirm(t("roles.resetConfirm"))) void run(() => apiFetch(`/admin/roles/${role.key}`, { method: "DELETE" }));
                  }}
                >
                  {t("roles.reset")}
                </button>
              )}
              {!role.builtin && (
                <button
                  type="button"
                  className={`${btn} border-breaking text-breaking`}
                  onClick={() => {
                    if (window.confirm(t("roles.deleteConfirm", { name: label }))) void run(() => apiFetch(`/admin/roles/${role.key}`, { method: "DELETE" }));
                  }}
                >
                  {t("common.delete")}
                </button>
              )}
              <button type="button" className={btn} onClick={() => setOpen(false)}>
                {t("common.close")}
              </button>
              <span role="status" className="text-sm text-muted">
                {saved ? t("common.saved") : ""}
              </span>
            </div>
          )}
          {role.locked && (
            <button type="button" className={`${btn} mt-3`} onClick={() => setOpen(false)}>
              {t("common.close")}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function RolesPage() {
  const t = useTranslations("cms");
  const locale = useLocale() as "bn" | "en";
  const { data, error, reload } = useApi<{ data: { roles: RoleRow[]; permissions: PermissionRow[] } }>("/admin/roles");
  const [name, setName] = useState({ bn: "", en: "" });
  const [permissions, setPermissions] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const roles = data?.data.roles ?? [];
  const catalog = data?.data.permissions ?? [];
  const label = (r: RoleRow) => (r.builtin ? t(`users.roles.${r.key}`) : r.name[locale] || r.name.bn || r.name.en || r.key);
  return (
    <div>
      <PageTitle>{t("nav.roles")}</PageTitle>
      <p className="mb-4 max-w-3xl text-sm text-muted">{t("roles.intro")}</p>
      <ErrorNote message={error ? t("common.error") : null} />
      <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface px-4">
        {roles.map((r) => (
          <RoleCard key={`${r.key}-${r.permissions.join()}`} role={r} catalog={catalog} label={label(r)} onChanged={reload} />
        ))}
      </ul>
      <div className="mt-6">
        <Panel title={t("roles.create")}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setCreateError(null);
              try {
                await apiFetch("/admin/roles", { method: "POST", body: { name, permissions } });
                setName({ bn: "", en: "" });
                setPermissions([]);
                await reload();
              } catch (err) {
                setCreateError(err instanceof ApiError ? err.message : t("common.error"));
              }
            }}
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                {t("roles.nameBn")}
                <input lang="bn" value={name.bn} maxLength={60} onChange={(e) => setName({ ...name, bn: e.target.value })} className={field} />
              </label>
              <label className="text-sm">
                {t("roles.nameEn")}
                <input lang="en" value={name.en} maxLength={60} onChange={(e) => setName({ ...name, en: e.target.value })} className={field} />
              </label>
            </div>
            <PermissionPicker value={permissions} onChange={setPermissions} catalog={catalog} disabled={false} idPrefix="new" />
            <ErrorNote message={createError} />
            <button type="submit" className={`${btnPrimary} mt-3`} disabled={!name.bn.trim() && !name.en.trim()}>
              {t("roles.createButton")}
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
