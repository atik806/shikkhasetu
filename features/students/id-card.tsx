"use client";

import { QRCodeSVG } from "qrcode.react";
import { GraduationCap } from "lucide-react";
import { Initials } from "@/components/shared";

/** Printable student ID card. The QR holds only the student ID — the gate looks the rest up. */
export function IdCard({ s }: { s: { name: string; studentId: string; sectionLabel: string; roll: number; bloodGroup?: string; school: string; schoolBn?: string; year: number; phone: string; shift?: string } }) {
  return (
    <div className="mx-auto w-[min(100%,340px)] overflow-hidden rounded-2xl border bg-card shadow-sm print:shadow-none">
      <div className="flex items-center gap-2 bg-primary px-4 py-3 text-primary-foreground">
        <GraduationCap className="size-6" aria-hidden />
        <div className="leading-tight">
          <p className="text-sm font-semibold">{s.school}</p>
          {s.schoolBn ? <p className="text-xs opacity-90">{s.schoolBn}</p> : null}
        </div>
      </div>
      <div className="flex gap-4 p-4">
        <Initials name={s.name} className="size-20 rounded-xl text-xl" />
        <div className="min-w-0 text-sm">
          <p className="font-heading text-base font-semibold">{s.name}</p>
          <p>{s.sectionLabel} · Roll {s.roll}</p>
          {s.shift ? <p className="text-muted-foreground">{s.shift} shift</p> : null}
          {s.bloodGroup ? <p className="text-muted-foreground">Blood group {s.bloodGroup}</p> : null}
          <p className="text-muted-foreground">Session {s.year}</p>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3 border-t px-4 py-3">
        <div className="text-xs">
          <p className="font-mono text-sm font-semibold">{s.studentId}</p>
          <p className="text-muted-foreground">If found, call {s.phone.replace("+88", "")}</p>
        </div>
        <div className="rounded-md bg-white p-1.5"><QRCodeSVG value={s.studentId} size={72} level="M" /></div>
      </div>
    </div>
  );
}
