import type { Metadata } from "next";
import { HeartHandshake, Languages, Scale, Sprout } from "lucide-react";
import { CtaBand, FeatureCard, PageHero, Section, SectionHeading } from "@/components/marketing/blocks";
import { RoundPhoto, SnapshotPhoto } from "@/components/marketing/doodles";

export const metadata: Metadata = {
  title: "About",
  description: "Why ShikkhaSetu exists: a bridge between school and home for Bangladeshi families.",
};

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="শিক্ষাসেতু — a bridge between school and home"
        lead="We started with one stubborn problem: a result card signed at home, by someone, and a teacher with no way of knowing who."
        aside={<SnapshotPhoto src="/images/school/teacher-with-students.jpg" alt="A young teacher sitting with her students in an outdoor classroom in Rangpur" caption="Teachers are the heart of it" rotate="rotate-[2deg]" priority sizes="(min-width: 1024px) 440px, 90vw" />}
      />
      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Why we exist" title="Parents have a right to know" />
            <RoundPhoto src="/images/school/students-outdoor-class.jpg" alt="Students sitting together in an outdoor class at a rural school" className="mt-8" sizes="(min-width: 1024px) 540px, 92vw" />
          </div>
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>In most Bangladeshi schools, news travels home through the child. The result card goes in the school bag, comes back with a signature, and everyone hopes it was the parent&apos;s. Attendance is a register in the staff room that families never see.</p>
            <p>That system works until it doesn&apos;t — a weak result hidden until the annual exam, a child leaving home in uniform and never reaching school. By the time the family finds out, months are gone.</p>
            <p>ShikkhaSetu (setu means bridge) gives schools a simple, local tool that sends that news directly to the family, records that it arrived, and keeps teachers in the loop — without asking anyone to become a computer expert.</p>
          </div>
        </div>
      </Section>
      <Section tone="cream">
        <SectionHeading align="center" eyebrow="Principles" title="What guides every decision" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard color="primary" icon={<HeartHandshake />} title="The family comes first">When in doubt, we choose the option that protects a parent&apos;s right to know.</FeatureCard>
          <FeatureCard color="coral" icon={<Scale />} title="Children are protected">Least access, masked data, no private chats between staff and children.</FeatureCard>
          <FeatureCard color="sky" icon={<Languages />} title="Bangla, plain words">If a parent who rarely uses apps cannot follow a screen, the screen is wrong.</FeatureCard>
          <FeatureCard color="sun" icon={<Sprout />} title="Honest software">We say what the product cannot do, and warnings are never automatic accusations.</FeatureCard>
        </div>
      </Section>
      <CtaBand title="Want ShikkhaSetu at your school?" lead="We work with a small number of pilot schools each term so we can set up every class properly." />
    </>
  );
}
