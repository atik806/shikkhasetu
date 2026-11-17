import type { Metadata } from "next";
import { BellRing, Building2, EyeOff, FileSearch, Flag, KeyRound, Lock, PhoneCall, ShieldAlert, Smartphone, UserX } from "lucide-react";
import { CheckList, CtaBand, FeatureCard, PageHero, Section, SectionHeading } from "@/components/marketing/blocks";
import { StickyNote } from "@/components/marketing/doodles";

export const metadata: Metadata = {
  title: "Trust & security",
  description: "How ShikkhaSetu makes forged result acknowledgments hard and visible, how it protects children's data, and what it cannot guarantee.",
};

const THREATS = [
  {
    icon: <Smartphone />,
    risk: "The child has the parent's phone and reads the SMS code.",
    defence: "The code alone is not enough — the parent's PIN is needed too, and it is set in person at the school office. The other guardian gets an SMS for every acknowledgment, and the parent can see every device their account is signed in on.",
  },
  {
    icon: <KeyRound />,
    risk: "The child knows or watched the parent's PIN.",
    defence: "Changing the PIN needs the current PIN and an SMS code. Resetting it happens only at the office and notifies every guardian. Repeated wrong attempts lock the PIN and are flagged to the teacher.",
  },
  {
    icon: <PhoneCall />,
    risk: "The child changes the guardian phone number to their own.",
    defence: "Only the school office can change a registered number, after checking the guardian. The old number gets an SMS, devices are signed out, and acknowledgments for the following days are flagged.",
  },
  {
    icon: <UserX />,
    risk: "The child creates a fake parent account.",
    defence: "There is no public sign-up. Parent accounts exist only because the school linked them from admission records and handed over a printed activation slip.",
  },
  {
    icon: <Flag />,
    risk: "Classmates acknowledge for each other from one phone.",
    defence: "One device acknowledging for several students who are not siblings is flagged high for the class teacher.",
  },
  {
    icon: <ShieldAlert />,
    risk: "A signed paper card comes back without a digital acknowledgment.",
    defence: "The teacher marks the paper as returned; the mismatch is highlighted, and the card's QR code shows “not acknowledged digitally” to anyone who scans it.",
  },
];

export default function Security() {
  return (
    <>
      <PageHero
        eyebrow="Trust & security"
        title="Built so the truth reaches the family"
        lead="The point of ShikkhaSetu is that a result or an absence cannot quietly stay hidden. Here is exactly how we make faking it hard — and where the limits are."
        aside={
          <div className="relative mx-auto h-72 w-full max-w-sm">
            <StickyNote color="sun" className="absolute top-0 left-0 rotate-[-4deg]">Parent PIN ✓<br />set at the school office</StickyNote>
            <StickyNote color="sky" className="absolute top-20 right-0 rotate-[5deg]">SMS code ✓<br />to the registered phone</StickyNote>
            <StickyNote color="leaf" className="absolute bottom-0 left-10 rotate-[-2deg]">Mother told ✓<br />teacher sees it ✓</StickyNote>
          </div>
        }
      />

      <Section>
        <SectionHeading eyebrow="Threat model" title="What a determined student might try, and what stops them" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {THREATS.map((t) => (
            <div key={t.risk} className="rounded-2xl border bg-card p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger [&_svg]:size-4.5" aria-hidden>{t.icon}</span>
                <p className="font-medium">{t.risk}</p>
              </div>
              <p className="mt-3 border-l-2 border-primary/40 pl-4 text-sm leading-relaxed text-muted-foreground">{t.defence}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-warning/40 bg-warning/10 p-6">
          <p className="font-heading font-semibold">Honest about limits</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            No app can promise that a parent personally looked at a screen. A child who has both the parent&apos;s phone and PIN could still try. What ShikkhaSetu guarantees is that it becomes much harder, that the other guardian hears about it, and that the class teacher sees warning signs worth a phone call. Warnings are prompts to check — never automatic accusations.
          </p>
        </div>
      </Section>

      <Section tone="cream">
        <SectionHeading eyebrow="Children's data" title="Privacy by default" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard color="primary" icon={<Lock />} title="Least access">Every role is limited to what it needs: teachers to their sections, parents to their own children, the gate to a name and photo.</FeatureCard>
          <FeatureCard color="coral" icon={<EyeOff />} title="Masked by default">Phone numbers appear as 017••••5678 in lists. The public card check shows a partly hidden name and no contact details.</FeatureCard>
          <FeatureCard color="sky" icon={<BellRing />} title="No silent changes">Phone changes, PIN resets and result corrections always notify the family.</FeatureCard>
          <FeatureCard color="sun" icon={<FileSearch />} title="Full audit trail">Sensitive actions record who, when, what changed and the reason given.</FeatureCard>
          <FeatureCard color="leaf" icon={<Building2 />} title="Your data, your school">Export everything as spreadsheets at any time. We never sell or share student data.</FeatureCard>
          <FeatureCard color="grape" icon={<UserX />} title="No child–staff DMs">Teachers message guardians about a child, never children privately.</FeatureCard>
        </div>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <SectionHeading eyebrow="Platform" title="How the service is run" />
          <CheckList
            items={[
              "Encrypted connections (HTTPS) everywhere; passwords and PINs stored only as salted hashes",
              "Every permission checked on the server, not just hidden in the app",
              "One-time codes expire in 5 minutes; three wrong attempts lock for 15 minutes",
              "Verification links use long random codes and are rate-limited",
              "Daily encrypted backups with tested restores",
              "Staff access to school data is logged and limited to support requests",
            ]}
          />
        </div>
        <p className="mt-10 text-sm text-muted-foreground">Found a security problem? Please email us — see the <a className="underline" href="/contact">contact page</a>. We respond within two working days.</p>
      </Section>
      <CtaBand />
    </>
  );
}
