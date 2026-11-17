"use client";

import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, Clock, History, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared";
import { fmtDate, fmtDateTime } from "@/lib/time";
import { useNum } from "@/lib/hooks";
import type { services } from "@/lib/services";
import { cn } from "@/lib/utils";

export type ResultDetail = Awaited<ReturnType<typeof services.results.resultDetail>>;

function gradeTone(letter: string) {
  if (letter === "F") return "danger" as const;
  if (letter === "A+" || letter === "A") return "success" as const;
  if (letter === "D" || letter === "C") return "warning" as const;
  return "info" as const;
}

export function ResultSummary({ d }: { d: ResultDetail }) {
  const t = useTranslations("result");
  const n = useNum();
  const r = d.result;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl border p-3">
        <p className="text-xs text-muted-foreground">{t("gpa")}</p>
        <p className={cn("font-heading text-3xl font-semibold tabular-nums", !r.passed && "text-danger")}>{n(r.gpa.toFixed(2))}</p>
        <StatusBadge tone={gradeTone(r.letter)}>{r.letter} · {r.passed ? t("passed") : t("failed")}</StatusBadge>
      </div>
      <div className="rounded-xl border p-3">
        <p className="text-xs text-muted-foreground">{t("total")}</p>
        <p className="font-heading text-2xl font-semibold tabular-nums">{n(r.totalObtained)}<span className="text-sm text-muted-foreground">/{n(r.totalFull)}</span></p>
      </div>
      <div className="rounded-xl border p-3">
        <p className="text-xs text-muted-foreground">{t("sectionPosition")}</p>
        <p className="font-heading text-2xl font-semibold tabular-nums">{r.sectionPosition ? n(r.sectionPosition) : "—"}</p>
        {r.classPosition ? <p className="text-xs text-muted-foreground">{t("classPosition")}: {n(r.classPosition)}</p> : null}
      </div>
      <div className="rounded-xl border p-3">
        <p className="text-xs text-muted-foreground">{t("attendance")}</p>
        <p className="font-heading text-2xl font-semibold tabular-nums">{r.attendancePercent !== undefined ? `${n(r.attendancePercent)}%` : "—"}</p>
      </div>
    </div>
  );
}

export function SubjectTable({ d }: { d: ResultDetail }) {
  const t = useTranslations("result");
  const n = useNum();
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">{t("subject")}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{t("marks")}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">%</th>
            <th scope="col" className="px-3 py-2 font-medium">{t("grade")}</th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">{t("highest")}</th>
          </tr>
        </thead>
        <tbody>
          {d.result.subjects.map((s) => (
            <tr key={s.subjectId} className="border-t">
              <td className="px-3 py-2">
                {s.name}
                {s.isOptional ? <span className="ml-1.5 text-xs text-muted-foreground">(4th subject)</span> : null}
                {s.componentFail ? <span className="block text-xs text-danger">Failed a part that must be passed separately</span> : null}
                {s.absent ? <span className="block text-xs text-danger">Absent</span> : null}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{n(s.obtained)}/{n(s.fullMarks)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{n(s.percent)}</td>
              <td className="px-3 py-2"><StatusBadge tone={gradeTone(s.letter)}>{s.letter} ({n(s.gp.toFixed(2))})</StatusBadge></td>
              <td className="hidden px-3 py-2 text-right text-muted-foreground tabular-nums sm:table-cell">{s.highest !== undefined ? n(s.highest) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AckStatusPanel({ d }: { d: ResultDetail }) {
  const t = useTranslations("ack");
  if (d.acks.length === 0 && !d.acknowledged) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <Clock className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
        <div>
          <p className="font-medium">{t("notYet")}</p>
          <p className="text-muted-foreground">{t("deadline", { date: fmtDate(d.result.deadline) })}</p>
        </div>
      </div>
    );
  }
  if (d.acks.length === 0 && d.acknowledged) {
    // student view — yes/no only
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
        <BadgeCheck className="size-5 text-success" aria-hidden /> Acknowledged by guardian ✓
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {d.acks.map((a) => (
        <div key={a.id} className="flex items-start gap-3 rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
          <BadgeCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-medium">{t("acknowledgedBy", { who: `${a.guardian} (${a.relation})${a.mine ? " — you" : ""}`, when: fmtDateTime(a.at) })}</p>
            <p className="text-xs text-muted-foreground">{a.channel === "app" ? "In the app with PIN + SMS code" : a.channel === "sms_code" ? "SMS code read to the class teacher on a call" : "In person at school"}</p>
            {a.comment ? <p className="mt-1 italic">“{a.comment}”</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function VersionHistory({ d }: { d: ResultDetail }) {
  const t = useTranslations("result");
  if (d.history.length <= 1) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="size-4" /> {t("history")}</CardTitle></CardHeader>
      <CardContent>
        <ol className="space-y-2 text-sm">
          {d.history.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={h.state === "PUBLISHED" ? "success" : "neutral"}>{t("version", { v: h.version })}</StatusBadge>
              <span>GPA {h.gpa.toFixed(2)}</span>
              <span className="text-muted-foreground">{fmtDateTime(h.publishedAt)}</span>
              {h.correctionReason ? <span className="w-full text-xs text-muted-foreground">Correction: {h.correctionReason}</span> : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/** A4 printable result card with QR verification. Hidden on screen, shown when printing. */
export function PrintableCard({ d }: { d: ResultDetail }) {
  // the whole app renders client-side only (after the data splash), so window is available
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const r = d.result;
  const url = `${origin}/verify/${r.verificationCode}`;
  return (
    <div className="hidden text-black print:block">
      <div className="flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <p className="text-xl font-bold">{d.school.name}</p>
          <p className="text-base">{d.school.nameBn}</p>
          <p className="text-xs">{d.school.address} · EIIN {d.school.eiin}</p>
        </div>
        <div className="text-right">
          <QRCodeSVG value={url} size={84} level="M" />
          <p className="mt-1 font-mono text-[10px]">{r.verificationCode}</p>
        </div>
      </div>
      <p className="mt-3 text-center text-lg font-semibold">{r.examName} — Result Card / ফলাফল কার্ড</p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr><td className="py-0.5 pr-2">Name / নাম:</td><td className="font-semibold">{d.student.name}</td><td className="pr-2">Student ID:</td><td>{d.student.studentId}</td></tr>
          <tr><td className="py-0.5 pr-2">Class / শ্রেণি:</td><td>{d.student.sectionLabel}</td><td className="pr-2">Roll / রোল:</td><td>{d.student.roll}</td></tr>
        </tbody>
      </table>
      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="border border-black">
            <th className="border border-black px-2 py-1 text-left">Subject / বিষয়</th>
            <th className="border border-black px-2 py-1">Full</th>
            <th className="border border-black px-2 py-1">Obtained</th>
            <th className="border border-black px-2 py-1">Grade</th>
            <th className="border border-black px-2 py-1">GP</th>
            <th className="border border-black px-2 py-1">Highest</th>
          </tr>
        </thead>
        <tbody>
          {r.subjects.map((s) => (
            <tr key={s.subjectId}>
              <td className="border border-black px-2 py-1">{s.name} / {s.nameBn}{s.isOptional ? " (4th)" : ""}</td>
              <td className="border border-black px-2 py-1 text-center">{s.fullMarks}</td>
              <td className="border border-black px-2 py-1 text-center">{s.absent ? "AB" : s.obtained}</td>
              <td className="border border-black px-2 py-1 text-center">{s.letter}</td>
              <td className="border border-black px-2 py-1 text-center">{s.gp.toFixed(2)}</td>
              <td className="border border-black px-2 py-1 text-center">{s.highest ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-4 gap-2 text-sm">
        <p>Total: <b>{r.totalObtained}/{r.totalFull}</b></p>
        <p>GPA: <b>{r.gpa.toFixed(2)} ({r.letter})</b></p>
        <p>Position: <b>{r.sectionPosition ?? "—"}</b></p>
        <p>Attendance: <b>{r.attendancePercent ?? "—"}%</b></p>
      </div>
      <p className="mt-2 text-sm">Remark: {r.teacherRemark}</p>
      <div className="mt-4 rounded border border-black p-2 text-xs">
        <b>Guardian acknowledgment:</b>{" "}
        {d.acks.length > 0 ? `Digitally acknowledged by ${d.acks[0].guardian} (${d.acks[0].relation}) on ${fmtDateTime(d.acks[0].at)}.` : "Not yet acknowledged digitally. Acknowledge in the ShikkhaSetu app."}{" "}
        Scan the QR code to verify this card and its acknowledgment status. A signature without a digital acknowledgment will be checked by the class teacher.
      </div>
      <div className="mt-12 grid grid-cols-3 gap-6 text-center text-xs">
        <p className="border-t border-black pt-1">Class teacher ({d.classTeacher})</p>
        <p className="border-t border-black pt-1">Guardian</p>
        <p className="border-t border-black pt-1">Head teacher</p>
      </div>
      <p className="mt-4 text-[10px]">Version {r.version}{r.correctionReason ? ` (corrected: ${r.correctionReason})` : ""} · Published {fmtDate(r.publishedAt)} · Printed {fmtDate(new Date().toISOString())}</p>
    </div>
  );
}

export function PrintButton({ disabled, title }: { disabled?: boolean; title?: string }) {
  const t = useTranslations("result");
  return (
    <Button variant="outline" onClick={() => window.print()} disabled={disabled} title={title}>
      <Printer /> {t("printCard")}
    </Button>
  );
}
