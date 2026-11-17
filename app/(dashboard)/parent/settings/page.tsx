"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Async, PageHeader } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { useSession } from "@/lib/auth/session";
import { MANDATORY_NOTIFICATIONS, type NotificationType } from "@/types";

const TYPES: { type: NotificationType; label: string; hint: string }[] = [
  { type: "gate_in", label: "Arrived at school", hint: "Gate check-in" },
  { type: "absent", label: "Marked absent", hint: "Always on" },
  { type: "mismatch", label: "At the gate but absent in class", hint: "Always on" },
  { type: "late", label: "Arrived late", hint: "" },
  { type: "left_early", label: "Left school early", hint: "" },
  { type: "gate_out", label: "Checked out after classes", hint: "" },
  { type: "absence_streak", label: "Absent several days in a row", hint: "" },
  { type: "result_published", label: "Result published", hint: "Always on" },
  { type: "result_corrected", label: "Result corrected", hint: "Always on" },
  { type: "result_acknowledged", label: "Another guardian acknowledged", hint: "" },
  { type: "notice", label: "Notices", hint: "Urgent notices always come by SMS" },
  { type: "leave_update", label: "Leave decisions", hint: "" },
  { type: "payment", label: "Payments", hint: "" },
  { type: "meeting", label: "Meetings", hint: "" },
  { type: "security", label: "Security alerts", hint: "Always on" },
];

export default function NotificationSettings() {
  const tc = useTranslations("common");
  const { banglaDigits, setBanglaDigits, locale, setLocale } = useSession();
  const q = useAppQuery(["prefs"], () => services.notifications.prefs());
  const set = useAction((i: { type: NotificationType; channel: "inApp" | "sms"; value: boolean }) => services.notifications.setPref(i.type, i.channel, i.value));
  return (
    <>
      <PageHeader title="Notification settings" description="Choose how you hear from the school. Absence and result alerts cannot be turned off." />
      <Card className="mb-5">
        <CardHeader><CardTitle className="text-base">{tc("language")}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center justify-between gap-2"><span>বাংলা ভাষা</span><Switch checked={locale === "bn"} onCheckedChange={(v) => setLocale(v ? "bn" : "en")} /></label>
          <label className="flex items-center justify-between gap-2"><span>{tc("banglaDigits")} (০১২৩)</span><Switch checked={banglaDigits} onCheckedChange={setBanglaDigits} /></label>
        </CardContent>
      </Card>
      <Async query={q}>
        {(d) => (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alerts</CardTitle>
              {!d.hasSmartphone ? <p className="text-xs text-muted-foreground">Your account is marked as feature-phone: you get SMS for everything.</p> : null}
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-y bg-muted/40">
                    <th scope="col" className="px-4 py-2 font-medium">Alert</th>
                    <th scope="col" className="px-2 py-2 text-center font-medium">In app</th>
                    <th scope="col" className="px-4 py-2 text-center font-medium">SMS</th>
                  </tr>
                </thead>
                <tbody>
                  {TYPES.map((row) => {
                    const mandatory = MANDATORY_NOTIFICATIONS.includes(row.type);
                    const p = d.prefs[row.type] ?? { inApp: true, sms: true };
                    return (
                      <tr key={row.type} className="border-b last:border-0">
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-1.5">{row.label}{mandatory ? <Lock className="size-3 text-muted-foreground" aria-label="Always on" /> : null}</span>
                          {row.hint ? <span className="block text-xs text-muted-foreground">{row.hint}</span> : null}
                        </td>
                        <td className="px-2 text-center"><Switch aria-label={`${row.label} in app`} checked={mandatory || p.inApp} disabled={mandatory} onCheckedChange={(v) => set.mutate({ type: row.type, channel: "inApp", value: v })} /></td>
                        <td className="px-4 text-center"><Switch aria-label={`${row.label} by SMS`} checked={mandatory || p.sms} disabled={mandatory} onCheckedChange={(v) => set.mutate({ type: row.type, channel: "sms", value: v })} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </Async>
    </>
  );
}
