import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileSearch,
  GraduationCap,
  Languages,
  Megaphone,
  MessageSquare,
  Phone,
  Plane,
  QrCode,
  ScanLine,
  School,
  ShieldCheck,
  Signature,
  Smartphone,
  TrendingUp,
  Users,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CARD_COLORS, CheckList, CtaBand, Eyebrow, Faq, FeatureCard, HandNote, Section, SectionHeading } from "@/components/marketing/blocks";
import { DashedPath, GradeSticker, PaperPlane, Pencil, RoundPhoto, SnapshotPhoto, Sparkle, Star, StickyNote } from "@/components/marketing/doodles";
import { GateTimeline, PaperVsVerified, ParentResultScreen, PhoneFrame, SmsBubble, TrackerMock } from "@/components/marketing/mockups";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "ShikkhaSetu — The school app parents can trust" },
  description: SITE.description,
};

const STEPS = [
  { icon: <ClipboardCheck />, title: "Teachers enter marks", body: "A fast, keyboard-friendly marks sheet. The class teacher reviews the whole section and locks it." },
  { icon: <BellRing />, title: "Results go straight home", body: "When the head teacher publishes, every guardian gets an SMS and an in-app notice. No school bag courier." },
  { icon: <ShieldCheck />, title: "Parent confirms with PIN + code", body: "The PIN is set at the school office. The code goes to the number the school registered." },
  { icon: <Signature />, title: "Everyone who should know, knows", body: "The other guardian gets an SMS. The class teacher sees who confirmed, how and when." },
];

const ROLES = [
  { icon: <UsersRound />, title: "Parents", body: "Arrival alerts, results to acknowledge, homework, fees with bKash or Nagad, leave and messages — in Bangla.", href: "/parents" },
  { icon: <Users />, title: "Teachers", body: "Attendance in under a minute, marks entry with autosave, homework, and parent messages that respect office hours.", href: "/features#teachers" },
  { icon: <Signature />, title: "Class teachers", body: "A live board of gate vs. class, the acknowledgment tracker, result review, leave approvals and remarks.", href: "/features#results" },
  { icon: <School />, title: "Head teacher & office", body: "Publish results, manage guardians, fees, routine, reports and a full audit log of sensitive changes.", href: "/features#admin" },
  { icon: <ScanLine />, title: "Gate staff", body: "Scan the ID card, check the face, tap IN or OUT. Keeps working through network drops.", href: "/features#gate" },
  { icon: <GraduationCap />, title: "Students", body: "Class routine, a homework checklist, results and a digital ID card. No private chats with staff.", href: "/features#students" },
];

const EVERYTHING = [
  { icon: <Megaphone />, title: "Notices", body: "School, class or section notices with read receipts." },
  { icon: <BookOpen />, title: "Homework & diary", body: "Parents see today's diary on their home screen." },
  { icon: <CalendarDays />, title: "Class routine", body: "Builder that flags a teacher or room booked twice." },
  { icon: <CreditCard />, title: "Fees", body: "Dues, waivers, receipts and mobile payments." },
  { icon: <Plane />, title: "Leave", body: "Parents request, the class teacher approves." },
  { icon: <MessageSquare />, title: "Messages", body: "Teacher ↔ guardian threads about one child." },
  { icon: <CalendarClock />, title: "Meetings", body: "Teachers publish slots, parents book them." },
  { icon: <BarChart3 />, title: "Reports", body: "Pass rate, grade spread, monthly attendance." },
  { icon: <TrendingUp />, title: "Promotion", body: "Year-end promotion by result, with overrides." },
  { icon: <FileSearch />, title: "Audit log", body: "Who changed what, when, and why." },
];

const FAQ = [
  { q: "Can a student still acknowledge a result pretending to be the parent?", a: <>It becomes much harder and, more importantly, visible. They would need the parent&apos;s PIN <em>and</em> phone, the other guardian gets an SMS, and the class teacher sees warning flags. See <Link className="underline" href="/security">Trust & security</Link>.</> },
  { q: "Many of our parents use basic phones. Does it still work?", a: "Yes. They get every alert by SMS. To acknowledge a result, the class teacher calls the registered number and the guardian reads out a one-time code." },
  { q: "Do we need a gate scanner?", a: "No. Any Android phone with a camera works, or the guard types the student ID. Schools without gate staff can switch the gate module off." },
  { q: "Is it in Bangla?", a: "Yes — parents and students can use the whole app in Bangla, including Bangla digits." },
];

export default function Home() {
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden notebook-bg">
        <Star className="absolute top-24 left-[44%] hidden size-9 rotate-12 lg:block" />
        <Sparkle className="absolute top-12 right-[6%] hidden size-7 sm:block" />
        <PaperPlane className="float-slow absolute bottom-16 left-[38%] hidden lg:block" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-28">
          <div className="pl-10 sm:pl-12">
            <Link href="/security" className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm font-medium shadow-sm ring-1 ring-black/5 hover:bg-muted">
              <span className="rounded-full bg-coral px-2 py-0.5 text-xs font-bold text-white">নতুন</span>
              Verified result acknowledgment
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <h1 className="mt-6 font-display text-[2.6rem] leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl">
              No more signing the result card <span className="squiggle-underline">at home</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
              ShikkhaSetu sends every result straight to the parent and records who really saw it. Families also know, within minutes, that their child reached school — and stayed in class.
            </p>
            <p className="mt-4 font-hand text-2xl text-primary" lang="bn">ফলাফল সরাসরি অভিভাবকের হাতে, হাজিরার খবর সাথে সাথে।</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="h-12 rounded-full px-7 text-base shadow-[0_6px_0_color-mix(in_oklch,var(--primary),black_25%)] transition-transform active:translate-y-1 active:shadow-none" render={<Link href="/contact" />}>Book a demo <ArrowRight /></Button>
              <Button size="lg" variant="outline" className="h-12 rounded-full bg-background px-7 text-base" render={<Link href="/login" />}>Try the live demo</Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2 text-sm">
              <li className="flex items-center gap-1.5 rounded-full bg-sky/15 px-3 py-1.5"><Languages className="size-4" aria-hidden /> বাংলা & English</li>
              <li className="flex items-center gap-1.5 rounded-full bg-leaf/15 px-3 py-1.5"><Phone className="size-4" aria-hidden /> Works with feature phones</li>
              <li className="flex items-center gap-1.5 rounded-full bg-sun/30 px-3 py-1.5"><GraduationCap className="size-4" aria-hidden /> NCTB GPA 5.00 grading</li>
            </ul>
          </div>

          {/* photo collage */}
          <div className="relative mx-auto h-[460px] w-full max-w-[520px] sm:h-[540px]">
            <SnapshotPhoto
              src="/images/school/girls-with-books.jpg"
              alt="Four smiling schoolgirls holding their books in a schoolyard in Bangladesh"
              caption="Class 5, ready for exams!"
              rotate="rotate-[-3deg]"
              className="absolute top-0 left-0 w-[78%]"
              priority
              sizes="(min-width: 1024px) 400px, 75vw"
            />
            <SnapshotPhoto
              src="/images/school/boy-writing.jpg"
              alt="A schoolboy concentrating on writing in his exercise book"
              rotate="rotate-[5deg]"
              aspect="aspect-[3/4]"
              className="absolute right-0 bottom-0 w-[42%]"
              sizes="(min-width: 1024px) 220px, 40vw"
            />
            <GradeSticker className="float-slower absolute right-[6%] top-[4%]" />
            <SmsBubble className="float-slow absolute bottom-[6%] left-0 w-60 sm:-left-6" time="7:28 AM" tone="success">✅ Rahim arrived at school at 7:28 AM.</SmsBubble>
            <HandNote className="absolute right-[40%] bottom-[34%] hidden rotate-[-6deg] sm:block">real alerts,<br />real families ↓</HandNote>
          </div>
        </div>
      </section>

      {/* ---------- Built for ---------- */}
      <div className="border-y bg-background">
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2.5 px-4 py-5 text-sm font-medium sm:px-6">
          {["Play to Class 10", "Morning & day shifts", "Bangla & English versions", "bKash · Nagad · Rocket", "SMS for every alert", "Friday weekend aware"].map((t, i) => (
            <li key={t} className={cn("rounded-full px-3.5 py-1.5", ["bg-primary/10", "bg-sun/30", "bg-coral/12", "bg-sky/15", "bg-leaf/15", "bg-grape/12"][i])}>{t}</li>
          ))}
        </ul>
      </div>

      {/* ---------- Problem ---------- */}
      <Section>
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading
              color="coral"
              eyebrow="The problem"
              title="A signature on paper proves nothing."
              lead="Today the child carries the result card home and back. Some cards get signed by the student. A bad result can stay hidden for a whole term, and the class teacher has no way to know."
            />
            <HandNote className="mt-6">Sound familiar? 🤔</HandNote>
          </div>
          <PaperVsVerified />
        </div>
      </Section>

      {/* ---------- How it works ---------- */}
      <Section tone="cream" id="how-it-works">
        <SectionHeading align="center" color="sky" eyebrow="How it works" title="From marks sheet to a confirmed parent — in four steps" />
        <ol className="relative mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <DashedPath className="absolute -top-10 left-[18%] hidden lg:block" />
          <DashedPath className="absolute -top-10 left-[68%] hidden -scale-y-100 lg:block" />
          {STEPS.map((s, i) => (
            <li key={s.title} className={cn("relative rounded-3xl bg-card p-6 pt-10 shadow-sm ring-1 ring-black/5 dark:ring-white/10", i % 2 ? "lg:mt-8" : "")}>
              <span className={cn("absolute -top-5 left-6 flex size-11 items-center justify-center rounded-full font-display text-xl font-extrabold shadow-md", ["bg-primary text-primary-foreground", "bg-sun text-neutral-900", "bg-coral text-white", "bg-sky text-white"][i])}>{i + 1}</span>
              <div className="text-muted-foreground [&_svg]:size-6" aria-hidden>{s.icon}</div>
              <h3 className="mt-3 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="max-w-2xl text-sm text-muted-foreground">Every printed card carries a QR code. Scan it to see whether a guardian acknowledged it digitally — a signature without that record stands out immediately.</p>
          <Button variant="outline" className="rounded-full bg-background" render={<Link href="/features#results" />}><QrCode /> How verification works</Button>
        </div>
      </Section>

      {/* ---------- Attendance ---------- */}
      <Section id="attendance">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="relative">
            <SnapshotPhoto
              src="/images/school/boys-with-bicycle.jpg"
              alt="Four schoolboys with a bicycle in front of a school wall painted with a Bangla rhyme about going to school happily"
              caption="মনের আনন্দে স্কুলে যাই!"
              rotate="rotate-[-2deg]"
              aspect="aspect-[7/8]"
              className="mx-auto w-[82%]"
              sizes="(min-width: 1024px) 430px, 82vw"
            />
            <StickyNote color="sky" className="absolute -right-2 -bottom-6 hidden w-48 rotate-[4deg] sm:block">Gate IN 7:28 ✓<br />Register: present ✓</StickyNote>
          </div>
          <div>
            <SectionHeading color="leaf" eyebrow="Attendance" title="“Did my child reach school today?” Answered by 7:30 AM." lead="The guard scans the ID card at the gate, the teacher takes the register, and ShikkhaSetu compares the two." />
            <CheckList
              className="mt-8"
              items={[
                <><b>Arrival, late, absent and early-leave alerts</b> by app and SMS.</>,
                <><b>Bunking shows up the same morning</b> — at the gate but absent in class alerts the parent and class teacher.</>,
                <><b>Three days absent in a row?</b> The family hears before it becomes three weeks.</>,
                <><b>Approved leave</b> is marked automatically and silences absent alerts.</>,
              ]}
            />
            <div className="mt-8 rounded-3xl bg-cream p-5 ring-1 ring-black/5 dark:ring-white/10"><GateTimeline /></div>
          </div>
        </div>
      </Section>

      {/* ---------- Parents' phone ---------- */}
      <Section tone="sun">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
          <div className="relative flex justify-center">
            <PhoneFrame className="relative z-10"><ParentResultScreen /></PhoneFrame>
            <SmsBubble className="absolute top-6 -right-2 z-20 hidden w-60 sm:block lg:right-0" time="9:42 PM">Result acknowledged by <b>Md. Abdul Karim (father)</b>. Mother notified.</SmsBubble>
            <Pencil className="absolute bottom-6 -left-4 rotate-[-25deg]" />
          </div>
          <div>
            <SectionHeading color="coral" eyebrow="In parents' hands" title="Bangla screens a busy parent can follow" lead="Big buttons, plain words, Bangla digits if they like. Parents with basic phones get everything by SMS." />
            <CheckList className="mt-8" items={["Today at school: arrived, late, absent or left early", "New results with one button to acknowledge", "Today's diary, notices and fees due", "One account for brothers and sisters"]} />
            <Button className="mt-8 h-11 rounded-full px-6" render={<Link href="/parents" />}>For parents · অভিভাবকদের জন্য <ArrowRight /></Button>
          </div>
        </div>
      </Section>

      {/* ---------- Class teachers ---------- */}
      <Section>
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionHeading color="grape" eyebrow="For class teachers" title="See who acknowledged — and what looks off." lead="Simple rules raise warnings for a teacher to follow up. Never automatic accusations." />
            <CheckList
              className="mt-8"
              variant="flag"
              items={[
                "A guardian's phone number was changed just before acknowledging",
                "One phone acknowledged results for several classmates who are not siblings",
                "Several wrong PIN or code attempts",
                "A paper card came back signed, but nobody acknowledged it digitally",
              ]}
            />
            <p className="mt-6 text-sm text-muted-foreground">Families sharing one phone is normal in Bangladesh — that alone is never treated as suspicious.</p>
          </div>
          <div className="relative">
            <RoundPhoto src="/images/school/classroom-drawings.jpg" alt="A teacher with a class of young students holding up their drawings" className="mb-[-4rem] ml-auto w-[70%]" sizes="(min-width: 1024px) 380px, 65vw" />
            <div className="relative"><TrackerMock /></div>
          </div>
        </div>
      </Section>

      {/* ---------- Roles ---------- */}
      <Section tone="cream">
        <SectionHeading align="center" eyebrow="One app, every role" title="Everyone sees exactly what they should — nothing more" lead="A teacher only reaches the sections they teach, a parent only their own children." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r, i) => (
            <Link key={r.title} href={r.href} className="group">
              <FeatureCard icon={r.icon} title={r.title} color={CARD_COLORS[i % CARD_COLORS.length]} className="h-full">
                {r.body}
                <span className="mt-3 flex items-center gap-1 font-medium text-foreground">Learn more <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden /></span>
              </FeatureCard>
            </Link>
          ))}
        </div>
      </Section>

      {/* ---------- Everything else ---------- */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <SectionHeading color="sky" eyebrow="And the daily work" title="Everything a school still does on paper" lead="One place for the office, the staff room and the family — with a record of who did what." />
            <SnapshotPhoto src="/images/school/teacher-with-students.jpg" alt="A young teacher sitting with her students in an outdoor class" caption="Less paperwork, more teaching" rotate="rotate-[-2deg]" className="mt-10 w-[88%]" sizes="(min-width: 1024px) 380px, 85vw" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {EVERYTHING.map((f, i) => (
              <div key={f.title} className="flex gap-4 rounded-2xl bg-card p-5 ring-1 ring-black/5 dark:ring-white/10">
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5", ["bg-primary/12 text-primary", "bg-coral/12 text-coral", "bg-sky/15 text-sky", "bg-sun/30 text-[color-mix(in_oklch,var(--sun),black_50%)]", "bg-leaf/15 text-leaf", "bg-grape/12 text-grape"][i % 6])} aria-hidden>{f.icon}</div>
                <div>
                  <h3 className="font-display text-lg font-bold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ---------- Bangladesh ---------- */}
      <section className="relative">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem]">
            <RoundPhoto src="/images/school/assembly-flag.jpg" alt="Students in school uniform raising the Bangladesh flag on the school field" aspect="aspect-[16/9] sm:aspect-[21/8]" className="rounded-[2rem]" sizes="(min-width: 1152px) 1152px, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-10">
              <Eyebrow color="sun" className="bg-sun text-neutral-900 ring-0">Made for Bangladesh</Eyebrow>
              <h2 className="mt-3 max-w-2xl font-display text-3xl leading-tight font-bold sm:text-4xl">Built around how our schools actually run</h2>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 grid max-w-6xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <FeatureCard color="primary" icon={<Languages />} title="Bangla first">Plain-language Bangla screens for parents, with Bangla digits if they prefer.</FeatureCard>
          <FeatureCard color="sky" icon={<Smartphone />} title="Feature phones">Every alert by SMS, and acknowledgment through a call from the school.</FeatureCard>
          <FeatureCard color="sun" icon={<GraduationCap />} title="Board grading">GPA 5.00, 33% pass mark, 4th-subject bonus, written and MCQ passed separately.</FeatureCard>
          <FeatureCard color="leaf" icon={<CreditCard />} title="Local payments">Tuition and exam fees through bKash, Nagad, Rocket or at the office.</FeatureCard>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <SectionHeading color="grape" eyebrow="Questions" title="What head teachers ask first" />
            <StickyNote className="mt-8 rotate-[-3deg]">Still curious? Try the live demo school — every role is there!</StickyNote>
            <Button variant="outline" className="mt-8 rounded-full" render={<Link href="/faq" />}>All questions <ArrowRight /></Button>
          </div>
          <Faq items={FAQ} />
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
