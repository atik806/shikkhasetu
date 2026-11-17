"use client";

import { LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async, PageHeader, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery, useMe } from "@/lib/hooks";
import { fmtDateTime } from "@/lib/time";

export default function Security() {
  const me = useMe();
  const q = useAppQuery(["devices"], () => services.auth.devices());
  const revoke = useAction((id: string) => services.auth.revokeDevice(id), { success: "Device signed out" });
  const all = useAction(() => services.auth.logoutAllOthers(), { success: "Signed out of all other devices" });
  return (
    <>
      <PageHeader title="Security" description="Check where your account is signed in. If you see a device you do not know — for example your child's phone — sign it out and tell the class teacher." />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Active devices</CardTitle>
            <Button size="sm" variant="outline" onClick={() => all.mutate(undefined)} disabled={all.isPending}><LogOut /> Log out of all other devices</Button>
          </CardHeader>
          <CardContent>
            <Async query={q}>
              {(devices) => (
                <ul className="divide-y">
                  {devices.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 py-3">
                      <Smartphone className="size-5 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{d.deviceLabel} {d.current ? <StatusBadge tone="success" className="ml-1">This device</StatusBadge> : null}</p>
                        <p className="text-xs text-muted-foreground">Last active {fmtDateTime(d.lastSeen)}</p>
                      </div>
                      {!d.current ? <Button size="sm" variant="ghost" onClick={() => revoke.mutate(d.id)}>Sign out</Button> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Async>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" /> Your parent PIN</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{me.data?.hasPin ? "Your PIN is set." : "You have no PIN yet."} You need it, plus a code sent to your registered phone, to acknowledge results.</p>
            <p>Never tell your PIN to your child. If you think your child knows it, ask the school office to reset it — every guardian will be told.</p>
            <p>Only the school office can change your registered phone number, after checking your NID in person.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
