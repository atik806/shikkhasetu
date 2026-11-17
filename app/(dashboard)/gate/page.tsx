"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CloudOff, LogIn, LogOut, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, Initials, NativeSelect, PageHeader, StatusBadge } from "@/components/shared";
import { QrScanner } from "@/features/attendance/components/qr-scanner";
import { useGateQueue } from "@/features/attendance/gate-queue";
import { services } from "@/lib/services";
import { useAppQuery } from "@/lib/hooks";
import { useDevStore } from "@/lib/mock/dev";
import { useQueryClient } from "@tanstack/react-query";
import { dhakaMinutes, fmtTime, hmToMinutes, nowISO } from "@/lib/time";

type Card_ = Awaited<ReturnType<typeof services.attendance.gateCardFor>>;

export default function GateScanner() {
  const qc = useQueryClient();
  const offline = useDevStore((s) => s.offline);
  const queue = useGateQueue();
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [card, setCard] = useState<Card_ | null>(null);
  const [early, setEarly] = useState(false);
  const [reason, setReason] = useState("sick");
  const [pickedUpBy, setPickedUpBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const results = useAppQuery(["gate-search", search], () => services.attendance.gateLookup(search), { enabled: search.trim().length >= 2 });

  const lookup = async (value: string) => {
    const v = value.trim();
    if (!v) return;
    try {
      setCard(await services.attendance.gateCardFor(v));
      setCode("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const record = async (type: "IN" | "OUT", extra: { reason?: string; pickedUpBy?: string } = {}) => {
    if (!card) return;
    const at = nowISO();
    if (offline) {
      queue.add({ id: `${card.id}:${at}`, studentId: card.id, studentName: card.name, type, at, ...extra });
      toast.warning(`Saved offline: ${card.name} ${type}. Will sync when online.`);
      setCard(null);
      return;
    }
    setBusy(true);
    try {
      const r = await services.attendance.gateScan({ studentId: card.id, type, ...extra });
      if (r.duplicate) toast.info(`${card.name} was already scanned ${type} in the last 2 minutes.`);
      else toast.success(`${card.name} — ${type}${r.late ? " (LATE)" : ""}${r.early ? " (early checkout)" : ""}. Guardians notified.`);
      setCard(null);
      await qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const tryOut = () => {
    if (!card) return;
    if (dhakaMinutes() < hmToMinutes(card.shift.endTime)) setEarly(true);
    else record("OUT");
  };

  // replay the offline queue when the network comes back
  const { items, remove } = queue;
  useEffect(() => {
    if (offline || items.length === 0 || syncing) return;
    let stop = false;
    (async () => {
      setSyncing(true);
      for (const it of items) {
        if (stop) break;
        try {
          await services.attendance.gateScan({ studentId: it.studentId, type: it.type, at: it.at, reason: it.reason, pickedUpBy: it.pickedUpBy });
          remove(it.id);
        } catch {
          break;
        }
      }
      setSyncing(false);
      await qc.invalidateQueries();
      if (!stop) toast.success("Offline scans synced");
    })();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline]);

  return (
    <>
      <PageHeader
        title="Gate scanner"
        description="Scan the QR on the student ID card, type the ID, or search by name. Check the face against the photo."
        actions={
          offline ? <StatusBadge tone="warning" icon={<CloudOff className="size-3" />}>Offline · {items.length} queued</StatusBadge>
          : items.length > 0 || syncing ? <StatusBadge tone="info" icon={<RefreshCw className="size-3 animate-spin" />}>Syncing {items.length}</StatusBadge>
          : <StatusBadge tone="success">Online · synced</StatusBadge>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <QrScanner onScan={lookup} />
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); lookup(code); }}>
                <label htmlFor="gate-code" className="sr-only">Student ID</label>
                <Input id="gate-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="DMHS-26-08101" className="h-11 font-mono" autoComplete="off" />
                <Button type="submit" className="h-11">Find</Button>
              </form>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input aria-label="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" className="h-10 pl-8" />
              </div>
              {search.trim().length >= 2 ? (
                <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border">
                  {(results.data ?? []).map((s) => (
                    <li key={s.id}>
                      <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setCard(s); setSearch(""); }}>
                        <Initials name={s.name} className="size-7" /> {s.name} <span className="ml-auto text-xs text-muted-foreground">{s.sectionLabel}</span>
                      </button>
                    </li>
                  ))}
                  {results.data?.length === 0 ? <li className="px-3 py-2 text-sm text-muted-foreground">No match</li> : null}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        </div>
        <Card className="min-h-80">
          {card ? (
            <>
              <CardHeader><CardTitle className="text-base">Confirm identity</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-4">
                  <Initials name={card.name} className="size-24 rounded-2xl text-2xl" />
                  <div>
                    <p className="font-heading text-2xl font-semibold">{card.name}</p>
                    <p className="text-muted-foreground">{card.sectionLabel} · Roll {card.roll}</p>
                    <p className="font-mono text-sm">{card.studentId}</p>
                    <p className="text-sm text-muted-foreground">{card.shift.name} shift {card.shift.startTime}–{card.shift.endTime}</p>
                    {card.lastEvent ? <p className="mt-1 text-sm">Last: <b>{card.lastEvent.type}</b> at {fmtTime(card.lastEvent.at)}</p> : null}
                    {card.onLeave ? <StatusBadge tone="info" className="mt-1">On approved leave today</StatusBadge> : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Photo placeholder — the school uploads student photos in the real system. Compare the face before confirming.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button className="h-16 text-lg" onClick={() => record("IN")} disabled={busy}><LogIn className="size-6" /> IN</Button>
                  <Button className="h-16 text-lg" variant="secondary" onClick={tryOut} disabled={busy}><LogOut className="size-6" /> OUT</Button>
                </div>
                <Button variant="ghost" className="w-full" onClick={() => setCard(null)}>Cancel</Button>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex h-full min-h-80 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <p className="font-medium text-foreground">Waiting for a scan</p>
              <p className="text-sm">Scans of the same kind within 2 minutes are ignored. Arrival after start time + grace is marked late.</p>
            </CardContent>
          )}
        </Card>
      </div>
      <Dialog open={early} onOpenChange={setEarly}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Early checkout</DialogTitle>
            <DialogDescription>Classes are not over yet. Record why {card?.name} is leaving and who picked them up. Guardians get an SMS.</DialogDescription>
          </DialogHeader>
          <NativeSelect label="Reason" value={reason} onChange={setReason} options={[{ value: "sick", label: "Sick" }, { value: "parent pickup", label: "Parent pickup" }, { value: "approved leave", label: "Approved leave" }, { value: "family emergency", label: "Family emergency" }]} />
          <Field label="Picked up by (name and relation)" htmlFor="pickup"><Input id="pickup" value={pickedUpBy} onChange={(e) => setPickedUpBy(e.target.value)} placeholder="e.g. Karim (father)" /></Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEarly(false)}>Cancel</Button>
            <Button disabled={!pickedUpBy.trim()} onClick={() => { setEarly(false); record("OUT", { reason, pickedUpBy: pickedUpBy.trim() }); setPickedUpBy(""); }}>Record checkout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
