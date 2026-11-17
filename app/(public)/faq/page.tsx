import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, Faq, PageHero, Section } from "@/components/marketing/blocks";
import { SnapshotPhoto, StickyNote } from "@/components/marketing/doodles";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about result acknowledgment, attendance alerts, feature phones, setup and data.",
};

const GROUPS: { title: string; items: { q: string; a: React.ReactNode }[] }[] = [
  {
    title: "Results & acknowledgment",
    items: [
      { q: "Does this replace the paper result card?", a: "It can, or it can sit beside it. Many schools keep printing cards; each one carries a QR code that shows whether a guardian acknowledged it digitally." },
      { q: "What exactly does the parent do?", a: "Open the result, tap “I have seen this result”, enter their parent PIN, then the 6-digit code sent by SMS to the number the school registered. It takes under a minute." },
      { q: "Can both parents acknowledge?", a: "Yes. Either guardian can, and the other is told by SMS when one does." },
      { q: "What if we publish a wrong mark?", a: "The head teacher corrects it with a written reason. A new version is published, the old one stays in history, and parents are asked to acknowledge again." },
      { q: "Can a student still fake it?", a: <>It becomes much harder and visible to the teacher. Read the full threat model on <Link className="underline" href="/security">Trust & security</Link>.</> },
    ],
  },
  {
    title: "Attendance & gate",
    items: [
      { q: "Do we need special hardware?", a: "No. An Android phone or tablet at the gate is enough. Student ID cards carry a QR code you can print yourselves." },
      { q: "What if the internet drops at the gate?", a: "Scans are stored on the device with their real time and sync when the connection returns." },
      { q: "We have no gate staff.", a: "Turn the gate module off. Parents then get arrival and absence alerts from the class register." },
      { q: "Do parents get alerts on holidays?", a: "No. Weekly holidays and the school calendar are excluded, and approved leave stops absent alerts." },
    ],
  },
  {
    title: "Parents & phones",
    items: [
      { q: "Many parents use basic phones.", a: "They receive every alert by SMS. For results, the class teacher calls the registered number from school and enters the code the guardian reads out." },
      { q: "Can a parent sign up themselves?", a: "No — on purpose. The school creates parent accounts from admission records and hands over an activation slip, so a child cannot open a fake parent account." },
      { q: "Is the parent app in Bangla?", a: "Yes, completely, with an option for Bangla digits." },
    ],
  },
  {
    title: "Setup & data",
    items: [
      { q: "How long does setup take?", a: "Most schools are ready within two weeks: we import students and guardians from your spreadsheet, set up classes, subjects and routine, and train staff on site." },
      { q: "Does it follow our grading?", a: "The default is the board GPA 5.00 scale with a 33% pass mark and the 4th-subject rule. Every band and pass rule can be changed per school." },
      { q: "Who owns the data?", a: "Your school. You can export it at any time, and we never sell or share student data." },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Frequently asked questions"
        lead="Can't find your answer? Ask us on the contact page — we usually reply the same working day."
        aside={
          <div className="relative mx-auto w-[70%]">
            <SnapshotPhoto src="/images/school/girl-in-uniform.jpg" alt="A confident girl in her blue school uniform" aspect="aspect-[4/5]" rotate="rotate-[3deg]" priority sizes="(min-width: 1024px) 340px, 70vw" />
            <StickyNote color="coral" className="absolute -bottom-6 -left-10 w-40 rotate-[-6deg] text-lg">Any questions? Raise your hand ✋</StickyNote>
          </div>
        }
      />
      <Section>
        <div className="mx-auto max-w-3xl space-y-12">
          {GROUPS.map((g, i) => (
            <div key={g.title}>
              <h2 className="mb-4 flex items-center gap-3 font-display text-2xl font-bold"><span className={["flex size-9 items-center justify-center rounded-full bg-primary text-base text-primary-foreground", "flex size-9 items-center justify-center rounded-full bg-sun text-base text-neutral-900", "flex size-9 items-center justify-center rounded-full bg-coral text-base text-white", "flex size-9 items-center justify-center rounded-full bg-sky text-base text-white"][i % 4]}>{i + 1}</span>{g.title}</h2>
              <Faq items={g.items} />
            </div>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
