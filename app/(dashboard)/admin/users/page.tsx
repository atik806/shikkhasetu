"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Async, DataTable, NativeSelect, PageHeader, Status } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { services } from "@/lib/services";
import { useAction, useAppQuery, useMe } from "@/lib/hooks";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import type { Role } from "@/types";

const ROLES: Role[] = ["school_admin", "teacher", "parent", "student", "gate_staff"];

export default function AdminUsers() {
  const me = useMe();
  const [role, setRole] = useState<Role | "all">("teacher");
  const [q, setQ] = useState("");
  const list = useAppQuery(["users", role, q], () => services.school.users({ role, q }));
  const [disable, setDisable] = useState<{ id: string; to: "active" | "disabled" } | null>(null);
  const [roles, setRoles] = useState<{ id: string; name: string; roles: Role[] } | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const status = useAction((r: string) => services.school.setUserStatus(disable!.id, disable!.to, r), { success: "Status changed", onSuccess: () => setDisable(null) });
  const saveRoles = useAction((r: string) => services.school.setRoles(roles!.id, roles!.roles, r), { success: "Roles updated", onSuccess: () => setRoles(null) });
  const reset = useAction((id: string) => services.school.resetPassword(id), { onSuccess: (r) => setTemp(r.tempPassword) });
  return (
    <>
      <PageHeader title="Users & roles" description="One person can hold several roles (e.g. a teacher who is also a parent). Access is permission-based — see the matrix below." />
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <NativeSelect className="w-44" label="Role" value={role} onChange={(v) => setRole(v as Role | "all")} options={[{ value: "all", label: "All roles" }, ...ROLES.map((r) => ({ value: r, label: r }))]} />
        <Input aria-label="Search" placeholder="Search name, phone, ID" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-64" />
      </div>
      {temp ? <p className="mb-3 rounded-lg bg-success/10 p-3 text-sm">Temporary password: <b className="font-mono">{temp}</b> — give it privately. All devices were signed out.</p> : null}
      <Async query={list}>
        {(rows) => (
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              { key: "name", header: "Name", cell: (r) => <span>{r.name}<span className="block text-xs text-muted-foreground">{r.loginId ?? r.phoneMasked}</span></span>, sortValue: (r) => r.name },
              { key: "roles", header: "Roles", cell: (r) => <span className="text-xs">{r.roles.join(", ")}</span> },
              { key: "st", header: "Status", cell: (r) => <Status value={r.status} /> },
              { key: "a", header: "", cell: (r) => r.id === me.data?.id ? <span className="text-xs text-muted-foreground">you</span> : (
                <div className="flex flex-wrap gap-1">
                  <Button size="xs" variant="ghost" onClick={() => setRoles({ id: r.id, name: r.name, roles: r.roles })}>Roles</Button>
                  <Button size="xs" variant="ghost" onClick={() => reset.mutate(r.id)}>Reset password</Button>
                  {r.status !== "invited" ? <Button size="xs" variant="ghost" className={r.status === "active" ? "text-danger" : ""} onClick={() => setDisable({ id: r.id, to: r.status === "active" ? "disabled" : "active" })}>{r.status === "active" ? "Disable" : "Enable"}</Button> : null}
                </div>
              ) },
            ]}
          />
        )}
      </Async>
      <details className="mt-6 rounded-xl border p-4">
        <summary className="cursor-pointer font-medium">Permission matrix</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="text-xs">
            <thead><tr><th scope="col" className="px-2 py-1 text-left">Permission</th>{ROLES.map((r) => <th key={r} scope="col" className="px-2 py-1">{r}</th>)}</tr></thead>
            <tbody>
              {[...new Set(Object.values(ROLE_PERMISSIONS).flat())].sort().map((p) => (
                <tr key={p} className="border-t"><td className="px-2 py-1 font-mono">{p}</td>{ROLES.map((r) => <td key={r} className="px-2 py-1 text-center">{ROLE_PERMISSIONS[r].includes(p) ? "✓" : ""}</td>)}</tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">Class teachers get extra permissions for their own section only (lock results, view acknowledgments, approve leave, resolve mismatches).</p>
        </div>
      </details>
      <ReasonDialog open={Boolean(disable)} onOpenChange={(o) => !o && setDisable(null)} title={disable?.to === "disabled" ? "Disable this account" : "Enable this account"} destructive={disable?.to === "disabled"} pending={status.isPending} onConfirm={(r) => status.mutate(r)} />
      <ReasonDialog open={Boolean(roles)} onOpenChange={(o) => !o && setRoles(null)} title={`Roles — ${roles?.name ?? ""}`} pending={saveRoles.isPending} onConfirm={(r) => saveRoles.mutate(r)}>
        <div className="flex flex-wrap gap-3">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-1.5 text-sm"><Checkbox checked={roles?.roles.includes(r)} onCheckedChange={(v) => setRoles((s) => (s ? { ...s, roles: v ? [...s.roles, r] : s.roles.filter((x) => x !== r) } : s))} /> {r}</label>
          ))}
        </div>
      </ReasonDialog>
    </>
  );
}
