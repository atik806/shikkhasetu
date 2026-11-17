"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Async, DataTable, NativeSelect, PageHeader } from "@/components/shared";
import { services } from "@/lib/services";
import { downloadCsv, useAppQuery } from "@/lib/hooks";
import { fmtDateTime } from "@/lib/time";

const ACTIONS = ["all", "results", "marks", "guardian", "attendance", "gate", "ack", "user", "student", "settings", "fees", "notice", "leave", "timetable"];
const show = (v: unknown) => (v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v));

export default function AuditLog() {
  const [action, setAction] = useState("all");
  const q = useAppQuery(["audit", action], () => services.reports.audit({ action }));
  return (
    <>
      <PageHeader title="Audit log" description="Every sensitive action: who, when, before/after, and why." actions={<Button variant="outline" onClick={() => q.data && downloadCsv("audit-log.csv", [["time", "actor", "action", "entity", "entity_id", "before", "after", "reason"], ...q.data.map((a) => [a.at, a.actor, a.action, a.entity, a.entityId, show(a.before), show(a.after), a.reason ?? ""])])}><Download /> CSV</Button>} />
      <Async query={q}>
        {(rows) => (
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            searchText={(r) => `${r.action} ${r.actor} ${r.entityId} ${r.reason ?? ""}`}
            pageSize={25}
            toolbar={<NativeSelect className="w-44" label="Action" value={action} onChange={setAction} options={ACTIONS.map((a) => ({ value: a, label: a === "all" ? "All actions" : a }))} />}
            columns={[
              { key: "at", header: "Time", cell: (r) => <span className="whitespace-nowrap text-xs">{fmtDateTime(r.at)}</span>, sortValue: (r) => r.at },
              { key: "actor", header: "Who", cell: (r) => r.actor, sortValue: (r) => r.actor },
              { key: "action", header: "Action", cell: (r) => <code className="text-xs">{r.action}</code>, sortValue: (r) => r.action },
              { key: "change", header: "Change", cell: (r) => <span className="block max-w-md text-xs break-words text-muted-foreground">{r.before !== undefined ? <>before: {show(r.before)}<br /></> : null}{r.after !== undefined ? <>after: {show(r.after)}</> : null}</span> },
              { key: "reason", header: "Reason", cell: (r) => <span className="text-xs">{r.reason}</span> },
            ]}
          />
        )}
      </Async>
    </>
  );
}
