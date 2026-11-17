import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarCheck, ClipboardList, CreditCard, FileSearch, IdCard, KeyRound, Megaphone, MessageSquare, Printer, QrCode, Radar, ScanLine, ShieldCheck, Signature, Ticket, UserCheck, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckList, CtaBand, FeatureCard, PageHero, Section, SectionHeading } from "@/components/marketing/blocks";
import { DashboardMock, GateTimeline, PaperVsVerified, PhoneFrame, PinScreen, TrackerMock } from "@/components/marketing/mockups";
import { GradeSticker, RoundPhoto, SnapshotPhoto } from "@/components/marketing/doodles";

export const metadata: Metadata = {
  title: "Features",
  description: "Verified result acknowledgment, gate and class attendance with parent alerts, marks entry, fees, homework, notices, timetable and reports for Bangladeshi schools.",
};

const TOC = [
  ["results", "Results & acknowledgment"],
  ["attendance", "Attendance"],
  ["gate", "Gate"],
  ["teachers", "Teachers"],
  ["admin", "Office & head teacher"],
  ["students", "Students"],
] as const;

export default function Features() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Everything your school runs on — built around trust"
        lead="Two things set ShikkhaSetu apart: results that parents provably saw, and attendance they hear about the same morning. Everything else your office does on paper comes along with it."
        aside={
          <>
            <SnapshotPhoto src="/images/school/boys-in-uniform-cheering.jpg" alt="A group of schoolboys in white uniform cheering on the road outside school" caption="Results day 🎉" rotate="rotate-[3deg]" priority sizes="(min-width: 1024px) 440px, 90vw" />
            <GradeSticker grade="GPA 5" label="well done!" className="absolute -bottom-6 -left-4 size-24 text-base" />
          </>
        }
      >
        <nav aria-label="On this page" className="flex flex-wrap gap-2">
          {TOC.map(([id, label]) => (
            <Link key={id} href={`#${id}`} className="rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-muted">{label}</Link>
          ))}
        </nav>
      </PageHero>

      <Section id="results">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <SectionHeading eyebrow="Results & acknowledgment" title="A result is only done when a guardian has seen it" />
            <CheckList
              className="mt-8"
              items={[
                <><b>Clear workflow:</b> teachers submit each subject → the class teacher reviews and locks the section → the head teacher publishes.</>,
                <><b>Board-standard grading</b> — GPA 5.00, 33% pass, 4th-subject bonus, separate written/MCQ pass, section and class positions. Every rule is editable.</>,
                <><b>Acknowledgment with PIN + SMS code</b> sent to the guardian phone registered by the school.</>,
                <><b>Cross-guardian SMS:</b> when the father acknowledges, the mother is told — and the other way round.</>,
                <><b>Corrections are versioned:</b> a changed mark needs a written reason, keeps history, and asks parents to acknowledge again.</>,
                <><b>Printable A4 card with a QR code.</b> Anyone can scan it to check that it is genuine and whether it was acknowledged.</>,
              ]}
            />
          </div>
          <div className="flex justify-center"><PhoneFrame><PinScreen /></PhoneFrame></div>
        </div>
        <div className="mt-16"><PaperVsVerified /></div>
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          <FeatureCard color="primary" icon={<Signature />} title="Class teacher tracker">Acknowledged, pending and overdue per student, one-tap SMS reminders, and the record of how each one was confirmed.</FeatureCard>
          <FeatureCard color="coral" icon={<UserCheck />} title="Parents without smartphones">The teacher sends an SMS code, calls the registered number from school, and enters the code the guardian reads out.</FeatureCard>
          <FeatureCard color="sky" icon={<QrCode />} title="Public card verification">The QR shows the school, exam, GPA and acknowledgment status — with the student&apos;s name partly hidden.</FeatureCard>
        </div>
      </Section>

      <Section id="attendance" tone="cream">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Attendance" title="Gate and classroom, compared every morning" />
            <CheckList
              className="mt-8"
              items={[
                "Daily register pre-filled from gate scans — tap only the exceptions",
                "Register locks at a time you choose; later edits need the class teacher and a reason",
                "Parent alerts: arrived, late, absent, left early, absent several days in a row",
                "Mismatch list for the class teacher: at the gate but absent in class, or present without a scan",
                "Monthly calendar for parents, school-wide trend for the head teacher",
                "Weekly holidays and the government calendar are excluded automatically",
              ]}
            />
          </div>
          <div className="rounded-3xl border bg-background p-6 sm:p-8"><GateTimeline /></div>
        </div>
      </Section>

      <Section id="gate">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeading eyebrow="Gate" title="A phone at the gate is all you need" lead="Turn it off entirely if your school has no gate staff — arrival alerts then come from the class register." />
          <RoundPhoto src="/images/school/smiling-children.jpg" alt="A group of smiling schoolchildren crowding together at the school entrance" aspect="aspect-[16/9]" sizes="(min-width: 1024px) 600px, 92vw" />
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard color="sun" icon={<ScanLine />} title="Scan or type">Camera scan of the ID card QR, typed student ID, or search by name.</FeatureCard>
          <FeatureCard color="leaf" icon={<IdCard />} title="Check the face">Name, class and photo on screen before tapping IN or OUT.</FeatureCard>
          <FeatureCard color="grape" icon={<Ticket />} title="Early checkout">Leaving before classes end needs a reason and who picked the child up.</FeatureCard>
          <FeatureCard color="primary" icon={<WifiOff />} title="Works offline">Scans are kept on the device during a network drop and sync later with their real time.</FeatureCard>
        </div>
      </Section>

      <Section id="teachers" tone="cream">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionHeading eyebrow="Teachers" title="Less paperwork, fewer phone calls" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <FeatureCard color="coral" icon={<CalendarCheck />} title="Register in a minute">Big tap targets on a phone. Present is the default.</FeatureCard>
              <FeatureCard color="sky" icon={<ClipboardList />} title="Marks like a spreadsheet">Arrow keys, autosave, AB for absent, CSV import and export.</FeatureCard>
              <FeatureCard color="sun" icon={<BookOpen />} title="Homework & diary">Parents see it the same day; you see who finished it.</FeatureCard>
              <FeatureCard color="leaf" icon={<Radar />} title="Section board">Class teachers see the live gate-vs-class view and absence streaks.</FeatureCard>
            </div>
          </div>
          <div className="relative">
            <SnapshotPhoto src="/images/school/boy-writing.jpg" alt="A schoolboy writing carefully in his exercise book" rotate="rotate-[-4deg]" aspect="aspect-[4/3]" className="mb-[-3rem] ml-6 w-[62%]" sizes="(min-width: 1024px) 340px, 60vw" />
            <div className="relative"><TrackerMock /></div>
          </div>
        </div>
      </Section>

      <Section id="admin">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <DashboardMock />
          <div>
            <SectionHeading eyebrow="Office & head teacher" title="Run the school from one screen" />
            <CheckList
              className="mt-8"
              items={[
                <><b>Guardian onboarding:</b> parent accounts come only from admission records — activation slips, in-person activation, no public sign-up.</>,
                <><b>Phone changes by the office only</b>, after checking the guardian. The old number is told, and acknowledgments for the next days are flagged.</>,
                "Classes, sections, shifts, versions, subject teachers and class teachers",
                "Fee structure per class, dues, waivers, office cash and mobile payments",
                "Class routine builder with clash detection",
                "Reports: pass rate, grade spread, subject averages, monthly attendance",
                "Year-end promotion with overrides",
              ]}
            />
          </div>
        </div>
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard color="grape" icon={<FileSearch />} title="Audit log">Every mark change, phone change and late register edit — who, when, before/after, why.</FeatureCard>
          <FeatureCard color="primary" icon={<KeyRound />} title="Roles & permissions">A teacher who is also a parent switches roles. Access is limited to their own classes and children.</FeatureCard>
          <FeatureCard color="coral" icon={<Megaphone />} title="Notices">Target the whole school, a class, a section or a role, with read receipts.</FeatureCard>
          <FeatureCard color="sky" icon={<CreditCard />} title="Fees">Results are never hidden from parents because of dues. Holding the printed card is optional.</FeatureCard>
        </div>
      </Section>

      <Section id="students" tone="cream">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Students" title="Useful for students, safe by design" lead="Students get their routine, homework checklist, results and digital ID card. They see only whether a guardian acknowledged a result — never who, when or how — and cannot trigger it." />
            <SnapshotPhoto src="/images/school/girl-in-uniform.jpg" alt="A smiling girl in her blue school uniform with arms folded" caption="My ID card is on my phone!" rotate="rotate-[-3deg]" aspect="aspect-[4/5]" className="mt-10 w-[60%]" sizes="(min-width: 1024px) 300px, 60vw" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureCard color="sun" icon={<MessageSquare />} title="No private DMs">Teachers talk to guardians, not privately to children.</FeatureCard>
            <FeatureCard color="leaf" icon={<ShieldCheck />} title="Minimal public data">The verification page masks names and shows nothing else.</FeatureCard>
            <FeatureCard color="grape" icon={<IdCard />} title="Digital ID card">QR for the gate, printable for the lanyard.</FeatureCard>
            <FeatureCard color="primary" icon={<Printer />} title="Printable everything">Result cards, receipts, ID cards, reports.</FeatureCard>
          </div>
        </div>
        <div className="mt-12 text-center"><Button size="lg" render={<Link href="/login" />}>Open the live demo</Button></div>
      </Section>

      <CtaBand />
    </>
  );
}
