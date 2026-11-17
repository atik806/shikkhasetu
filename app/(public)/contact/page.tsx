import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MonitorPlay } from "lucide-react";
import { PageHero, Section } from "@/components/marketing/blocks";
import { ContactForm } from "@/features/marketing/contact-form";
import { SnapshotPhoto, StickyNote } from "@/components/marketing/doodles";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book a demo",
  description: "Book a 30-minute ShikkhaSetu demo for your school, online or on campus.",
};

export default function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Book a demo for your school"
        lead="Tell us a little about your school. We'll walk you through it in 30 minutes — online or at your campus — using your own classes and exam pattern."
        aside={
          <div className="relative mx-auto w-[85%]">
            <SnapshotPhoto src="/images/school/classroom-drawings.jpg" alt="A teacher with a class of students holding up their drawings" caption="Come see a class like yours" rotate="rotate-[-2deg]" priority sizes="(min-width: 1024px) 400px, 85vw" />
            <StickyNote className="absolute -right-6 -bottom-8 w-40 rotate-[6deg] text-lg">30 minutes, free ☕</StickyNote>
          </div>
        }
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <ContactForm />
          <aside className="space-y-6">
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="font-heading font-semibold">What happens next</h2>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li><b className="text-foreground">1.</b> We call to understand your classes, shifts and exams.</li>
                <li><b className="text-foreground">2.</b> A 30-minute walkthrough for the head teacher and office.</li>
                <li><b className="text-foreground">3.</b> If it fits, a free one-term pilot with one or two classes.</li>
              </ol>
            </div>
            <ul className="space-y-4 rounded-2xl border bg-card p-6 text-sm">
              <li className="flex gap-3"><Mail className="size-5 shrink-0 text-primary" aria-hidden /><div><p className="font-medium">Email</p><a className="text-muted-foreground hover:text-foreground" href={`mailto:${SITE.email}`}>{SITE.email}</a></div></li>
              <li className="flex gap-3"><MapPin className="size-5 shrink-0 text-primary" aria-hidden /><div><p className="font-medium">Office</p><p className="text-muted-foreground">{SITE.city}</p></div></li>
              <li className="flex gap-3"><Clock className="size-5 shrink-0 text-primary" aria-hidden /><div><p className="font-medium">Hours</p><p className="text-muted-foreground">{SITE.hours}</p></div></li>
            </ul>
            <Link href="/login" className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-6 hover:bg-primary/10">
              <MonitorPlay className="size-6 text-primary" aria-hidden />
              <div><p className="font-medium">Can&apos;t wait?</p><p className="text-sm text-muted-foreground">Open the live demo school and try every role yourself.</p></div>
            </Link>
          </aside>
        </div>
      </Section>
    </>
  );
}
