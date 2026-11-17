import { BadgeCheck, Bell, CheckCircle2, Clock, DoorOpen, Flag, LogIn, MessageSquare, ShieldCheck, Signature, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Static product illustrations built from markup (crisp at any size, dark-mode aware, no image files). */

export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative w-[280px] rounded-[2.4rem] border-[10px] border-neutral-900 bg-background shadow-2xl ring-1 ring-black/10 dark:border-neutral-700", className)}>
      <div aria-hidden className="absolute top-2 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-neutral-900 dark:bg-neutral-700" />
      <div className="overflow-hidden rounded-[1.7rem]">{children}</div>
    </div>
  );
}

/** Parent app: result + acknowledge button. */
export function ParentResultScreen() {
  const rows = [
    ["বাংলা", "78", "A"],
    ["English", "84", "A+"],
    ["গণিত", "91", "A+"],
    ["বিজ্ঞান", "69", "A-"],
  ];
  return (
    <div className="bg-background pt-9 text-[11px]">
      <div className="px-4 pb-3">
        <p className="text-muted-foreground">আসসালামু আলাইকুম, করিম সাহেব</p>
        <p className="mt-0.5 font-heading text-base font-semibold">Rahim · Class 8-A</p>
      </div>
      <div className="mx-3 rounded-xl border border-primary/30 bg-primary/8 p-3">
        <p className="font-semibold text-primary">নতুন ফলাফল প্রকাশিত হয়েছে</p>
        <p className="text-muted-foreground">Half-Yearly Examination 2026</p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">GPA</p>
            <p className="font-heading text-2xl leading-none font-semibold">4.63</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Position</p>
            <p className="font-heading text-lg leading-none font-semibold">5 / 40</p>
          </div>
        </div>
      </div>
      <ul className="mx-3 mt-3 divide-y rounded-xl border">
        {rows.map(([s, m, g]) => (
          <li key={s} className="flex items-center justify-between px-3 py-2">
            <span>{s}</span>
            <span className="tabular-nums text-muted-foreground">{m}</span>
            <span className="rounded bg-success/12 px-1.5 py-0.5 font-medium text-success">{g}</span>
          </li>
        ))}
      </ul>
      <div className="p-3">
        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-[12px] font-semibold text-primary-foreground">
          <Signature className="size-4" aria-hidden /> আমি এই ফলাফল দেখেছি
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">PIN + SMS code · অন্য অভিভাবককেও জানানো হবে</p>
      </div>
    </div>
  );
}

/** Parent app: PIN step. */
export function PinScreen() {
  return (
    <div className="bg-background px-4 pt-10 pb-6 text-[11px]">
      <ShieldCheck className="size-7 text-primary" aria-hidden />
      <p className="mt-2 font-heading text-base font-semibold">Enter your parent PIN</p>
      <p className="text-muted-foreground">Set at the school office. Never tell it to your child.</p>
      <div className="mt-4 flex justify-center gap-2">
        {[1, 2, 3, 4].map((i) => <span key={i} className="flex size-10 items-center justify-center rounded-lg border text-lg">•</span>)}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) => <span key={i} className={cn("rounded-lg py-2", k && "bg-muted")}>{k}</span>)}
      </div>
    </div>
  );
}

export function SmsBubble({ from = "DMHS", time, children, tone = "default", className }: { from?: string; time: string; children: React.ReactNode; tone?: "default" | "alert" | "success"; className?: string }) {
  return (
    <div className={cn("w-72 rounded-2xl border bg-card p-3 text-xs shadow-xl", className)}>
      <div className="flex items-center gap-2">
        <span className={cn("flex size-7 items-center justify-center rounded-full", tone === "alert" ? "bg-danger/12 text-danger" : tone === "success" ? "bg-success/12 text-success" : "bg-primary/12 text-primary")}>
          {tone === "alert" ? <TriangleAlert className="size-3.5" aria-hidden /> : tone === "success" ? <CheckCircle2 className="size-3.5" aria-hidden /> : <MessageSquare className="size-3.5" aria-hidden />}
        </span>
        <span className="font-semibold">{from}</span>
        <span className="ml-auto text-muted-foreground">{time}</span>
      </div>
      <p className="mt-2 leading-relaxed">{children}</p>
    </div>
  );
}

/** Left: the paper card with a signature nobody can check. Right: the verified version. */
export function PaperVsVerified() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <figure className="rotate-[-1.5deg] rounded-xl border bg-[oklch(0.98_0.01_90)] p-5 text-neutral-800 shadow-lg dark:bg-[oklch(0.93_0.02_90)]">
        <p className="text-center text-[11px] font-semibold tracking-wide uppercase">Result card · ফলাফল কার্ড</p>
        <div className="mt-3 space-y-1.5 text-[11px]">
          {["Bangla 42", "English 38", "Mathematics 21 (F)", "Science 35"].map((r) => <p key={r} className="border-b border-dashed border-neutral-300 pb-1">{r}</p>)}
        </div>
        <div className="mt-6 flex items-end justify-between text-[10px]">
          <span>Class teacher</span>
          <span className="relative">
            <span className="absolute -top-6 right-0 font-serif text-lg italic text-blue-700" style={{ fontFamily: "cursive" }}>Abdul K.</span>
            Guardian&apos;s signature
          </span>
        </div>
        <figcaption className="mt-4 rounded-lg bg-danger/10 p-2 text-[11px] text-danger">
          Signed at home — by the parent, or by the child? The teacher cannot tell.
        </figcaption>
      </figure>
      <figure className="rotate-[1deg] rounded-xl border bg-card p-5 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Verified acknowledgment</p>
            <p className="mt-1 font-heading text-base font-semibold">Rahim Karim · 8-A</p>
          </div>
          <QrGlyph />
        </div>
        <div className="mt-4 space-y-2 text-[11px]">
          <p className="flex items-center gap-2"><BadgeCheck className="size-4 text-success" aria-hidden /> Md. Abdul Karim (father)</p>
          <p className="flex items-center gap-2"><ShieldCheck className="size-4 text-success" aria-hidden /> PIN + SMS code to 017••••0100</p>
          <p className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground" aria-hidden /> 12 Jul 2026, 9:41 PM</p>
          <p className="flex items-center gap-2"><Bell className="size-4 text-muted-foreground" aria-hidden /> Mother notified by SMS</p>
        </div>
        <figcaption className="mt-4 rounded-lg bg-success/10 p-2 text-[11px] text-success">
          The class teacher sees who confirmed, how, and when — and the QR proves it.
        </figcaption>
      </figure>
    </div>
  );
}

function QrGlyph() {
  // decorative QR-like pattern (not scannable)
  const cells = "1110111010001101011010111000101011101111011100010101100110101110101101001011101011".split("");
  return (
    <div aria-hidden className="grid size-14 grid-cols-9 gap-px rounded bg-white p-1">
      {cells.slice(0, 81).map((c, i) => <span key={i} className={c === "1" ? "bg-neutral-900" : "bg-white"} />)}
    </div>
  );
}

/** A morning in the life of a parent's phone. */
export function GateTimeline() {
  const items = [
    { t: "7:28 AM", icon: <LogIn className="size-4" />, title: "Rahim arrived at school", body: "Checked in at the gate with his ID card.", tone: "success" as const },
    { t: "8:05 AM", icon: <CheckCircle2 className="size-4" />, title: "Class register: present", body: "Mahmudul Hasan, class teacher 8-A.", tone: "success" as const },
    { t: "8:06 AM", icon: <TriangleAlert className="size-4" />, title: "Tanvir was at the gate but absent in class", body: "Checked in 7:31 AM · class teacher alerted.", tone: "danger" as const },
    { t: "11:10 AM", icon: <DoorOpen className="size-4" />, title: "Nusrat left school early", body: "Reason: sick · picked up by her uncle.", tone: "warning" as const },
  ];
  const toneCls = { success: "bg-success/12 text-success", danger: "bg-danger/12 text-danger", warning: "bg-warning/15 text-warning" };
  return (
    <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
      {items.map((it) => (
        <li key={it.t} className="relative flex gap-4">
          <span className={cn("z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background", toneCls[it.tone])} aria-hidden>{it.icon}</span>
          <div className="min-w-0 rounded-xl border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">{it.t}</p>
            <p className="font-medium">{it.title}</p>
            <p className="text-sm text-muted-foreground">{it.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Class teacher's acknowledgment tracker. */
export function TrackerMock() {
  const rows = [
    { roll: 1, name: "Rahim Karim", st: "Acknowledged", by: "Father · app · PIN+OTP", tone: "success", flag: null },
    { roll: 4, name: "Arif Hossain", st: "Acknowledged", by: "Father · app", tone: "success", flag: "Phone changed 3 days ago" },
    { roll: 11, name: "Sakib Rahman", st: "Acknowledged", by: "Father · app", tone: "success", flag: "Same device as 2 classmates" },
    { roll: 12, name: "Nayeem Mia", st: "Acknowledged", by: "Father · SMS code + call", tone: "success", flag: null },
    { roll: 14, name: "Fahim Uddin", st: "Paper signed only", by: "No digital acknowledgment", tone: "danger", flag: null },
    { roll: 17, name: "Tasnim Akter", st: "Pending", by: "Reminder sent", tone: "warning", flag: null },
  ];
  const tone: Record<string, string> = { success: "bg-success/12 text-success", danger: "bg-danger/12 text-danger", warning: "bg-warning/15 text-warning" };
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xl">
      <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-400" /><span className="size-2.5 rounded-full bg-amber-400" /><span className="size-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-xs text-muted-foreground">Acknowledgments · Class 8-A · Half-Yearly</span>
      </div>
      <div className="grid grid-cols-4 gap-2 border-b p-4 text-center">
        {[["31/36", "acknowledged"], ["3", "pending"], ["2", "need follow-up"], ["1", "paper only"]].map(([v, l]) => (
          <div key={l}><p className="font-heading text-xl font-semibold">{v}</p><p className="text-[10px] text-muted-foreground">{l}</p></div>
        ))}
      </div>
      <ul className="divide-y text-xs">
        {rows.map((r) => (
          <li key={r.roll} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
            <span className="w-5 text-muted-foreground tabular-nums">{r.roll}</span>
            <span className="font-medium">{r.name}</span>
            <span className={cn("rounded-full px-2 py-0.5 font-medium", tone[r.tone])}>{r.st}</span>
            <span className="text-muted-foreground">{r.by}</span>
            {r.flag ? <span className="ml-auto flex items-center gap-1 text-danger"><Flag className="size-3" aria-hidden />{r.flag}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Admin dashboard glimpse. */
export function DashboardMock() {
  const bars = [92, 94, 91, 95, 93, 89, 94, 96, 95, 93];
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xl">
      <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-400" /><span className="size-2.5 rounded-full bg-amber-400" /><span className="size-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-xs text-muted-foreground">Dashboard · Dhaka Model High School</span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        {[["Attendance today", "94.2%"], ["Gate check-ins", "612"], ["Results acknowledged", "88%"], ["Collected (Nov)", "৳4.1L"]].map(([l, v]) => (
          <div key={l} className="rounded-xl border p-3"><p className="text-[10px] text-muted-foreground">{l}</p><p className="font-heading text-lg font-semibold">{v}</p></div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <p className="mb-2 text-[11px] text-muted-foreground">Attendance — last 10 school days</p>
        <div className="flex h-24 items-end gap-2">
          {bars.map((b, i) => <div key={i} className="flex-1 rounded-t bg-primary/80" style={{ height: `${(b - 80) * 5}%` }} />)}
        </div>
      </div>
    </div>
  );
}
