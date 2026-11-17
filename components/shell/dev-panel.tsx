"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Wrench, X, RotateCcw, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useDevStore } from "@/lib/mock/dev";
import { reseed } from "@/lib/mock/db";
import { services } from "@/lib/services";
import { useAppQuery } from "@/lib/hooks";
import { fmtDateTime, fmtTime, nowISO, offsetToDhakaTime } from "@/lib/time";
import { cn } from "@/lib/utils";

/** Demo tools. This whole app is a frontend demo, so the panel is on unless NEXT_PUBLIC_DEMO=0. */
export function DevPanel() {
  const t = useTranslations("dev");
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"sms" | "tools">("sms");
  const dev = useDevStore();
  const outbox = useAppQuery(["sms-outbox"], () => services.notifications.smsOutbox(), { enabled: open, refetchInterval: open ? 3000 : undefined });
  if (process.env.NEXT_PUBLIC_DEMO === "0") return null;

  const setTime = (hm: string | null) => {
    if (!hm) dev.setClockOffsetMs(0);
    else dev.setClockOffsetMs(offsetToDhakaTime(hm));
    qc.invalidateQueries();
  };

  return (
    <div className="no-print fixed right-3 bottom-20 z-40 lg:bottom-4">
      {open ? (
        <div className="flex max-h-[75vh] w-[min(94vw,400px)] flex-col overflow-hidden rounded-xl border bg-popover shadow-xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="flex items-center gap-2 text-sm font-semibold"><Wrench className="size-4" /> {t("title")}</p>
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close dev panel"><X /></Button>
          </div>
          <div className="flex gap-1 border-b px-2 py-1.5">
            {(["sms", "tools"] as const).map((k) => (
              <Button key={k} size="xs" variant={tab === k ? "secondary" : "ghost"} onClick={() => setTab(k)}>{k === "sms" ? t("outbox") : "Tools"}</Button>
            ))}
          </div>
          {tab === "sms" ? (
            <div className="flex-1 overflow-y-auto">
              <p className="px-3 py-2 text-xs text-muted-foreground">{t("outboxHint")}</p>
              <ul>
                {(outbox.data ?? []).map((m) => {
                  const code = m.body.match(/\b(\d{6})\b/)?.[1];
                  return (
                    <li key={m.id} className={cn("border-t px-3 py-2 text-xs", m.kind !== "notification" && "bg-warning/10")}>
                      <div className="flex justify-between gap-2 text-muted-foreground">
                        <span>→ {m.toMasked} {m.toName ? `(${m.toName})` : ""}</span>
                        <span>{fmtTime(m.at)}</span>
                      </div>
                      <p className="mt-0.5">{m.body}</p>
                      {code && m.kind !== "notification" ? (
                        <Button size="xs" variant="outline" className="mt-1" onClick={() => { navigator.clipboard?.writeText(code); toast.success(`Copied ${code}`); }}>
                          <Copy /> {code}
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto p-3 text-sm">
              <div>
                <p className="mb-1.5 font-medium">{t("clock")}</p>
                <p className="mb-2 text-xs text-muted-foreground">Now: {fmtDateTime(nowISO())} (Asia/Dhaka)</p>
                <div className="flex flex-wrap gap-1.5">
                  {["07:20", "07:45", "09:00", "10:45", "12:40", "16:00", "21:30"].map((hm) => (
                    <Button key={hm} size="xs" variant="outline" onClick={() => setTime(hm)}>{hm}</Button>
                  ))}
                  <Button size="xs" variant="secondary" onClick={() => setTime(null)}>{t("clockNow")}</Button>
                </div>
              </div>
              <label className="flex items-center justify-between gap-2"><span>{t("latency")}</span><Switch checked={dev.latency} onCheckedChange={(v) => dev.set({ latency: v })} /></label>
              <label className="flex items-center justify-between gap-2"><span>{t("errors")} (30%)</span><Switch checked={dev.errorRate > 0} onCheckedChange={(v) => dev.set({ errorRate: v ? 0.3 : 0 })} /></label>
              <label className="flex items-center justify-between gap-2"><span>{t("offline")}</span><Switch checked={dev.offline} onCheckedChange={(v) => dev.set({ offline: v })} /></label>
              <div className="border-t pt-3">
                <p className="mb-2 text-xs text-muted-foreground">{t("resetConfirm")}</p>
                <Button variant="destructive" size="sm" onClick={() => { reseed(); qc.invalidateQueries(); toast.success("Demo data reset"); }}>
                  <RotateCcw /> {t("reset")}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Button variant="outline" size="sm" className="shadow-md" onClick={() => setOpen(true)} aria-label={t("title")}>
          <Wrench /> <span className="hidden sm:inline">{t("title")}</span>
        </Button>
      )}
    </div>
  );
}
