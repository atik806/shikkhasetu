import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pencil, Sparkle, Star } from "./doodles";
import { cn } from "@/lib/utils";

export type Tone = "default" | "cream" | "sky" | "sun" | "leaf";
const TONE_BG: Record<Tone, string> = {
  default: "",
  cream: "bg-cream",
  sky: "bg-[color-mix(in_oklch,var(--sky),var(--background)_88%)]",
  sun: "bg-[color-mix(in_oklch,var(--sun),var(--background)_82%)]",
  leaf: "bg-[color-mix(in_oklch,var(--leaf),var(--background)_88%)]",
};

export function Section({ id, className, children, tone = "default" }: { id?: string; className?: string; children: ReactNode; tone?: Tone }) {
  return (
    <section id={id} className={cn("relative scroll-mt-20 py-16 sm:py-24", TONE_BG[tone], className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

/** Small sticker-style label above a heading. */
type EyebrowColor = "primary" | "coral" | "sky" | "sun" | "grape" | "leaf";
export function Eyebrow({ children, className, color = "primary" }: { children: ReactNode; className?: string; color?: EyebrowColor }) {
  const palette: Record<EyebrowColor, string> = {
    leaf: "bg-leaf/15 text-[color-mix(in_oklch,var(--leaf),black_35%)] ring-leaf/30 dark:text-leaf",
    primary: "bg-primary/10 text-primary ring-primary/20",
    coral: "bg-coral/12 text-coral ring-coral/25",
    sky: "bg-sky/15 text-[color-mix(in_oklch,var(--sky),black_30%)] ring-sky/30 dark:text-sky",
    sun: "bg-sun/25 text-[color-mix(in_oklch,var(--sun),black_55%)] ring-sun/40 dark:text-sun",
    grape: "bg-grape/12 text-grape ring-grape/25",
  };
  const c = palette[color];
  return <p className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1", c, className)}>{children}</p>;
}

export function SectionHeading({ eyebrow, title, lead, align = "left", className, color }: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; align?: "left" | "center"; className?: string; color?: EyebrowColor }) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <Eyebrow color={color}>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-3 font-display text-3xl leading-[1.1] font-bold tracking-tight text-balance sm:text-[2.6rem]">{title}</h2>
      {lead ? <p className="mt-4 text-base text-pretty text-muted-foreground sm:text-lg">{lead}</p> : null}
    </div>
  );
}

export function PageHero({ eyebrow, title, lead, children, aside }: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; children?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b notebook-bg">
      <Star className="absolute top-10 right-[8%] hidden size-10 rotate-12 sm:block" />
      <Sparkle className="absolute bottom-10 left-[46%] hidden sm:block" />
      <div className={cn("relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-14 pb-16 sm:px-6 sm:pt-20", aside && "lg:grid-cols-[1.2fr_1fr]")}>
        {/* left padding keeps text clear of the notebook's red margin line */}
        <div className="pl-10 sm:pl-12">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-[3.4rem]">{title}</h1>
          {lead ? <p className="mt-5 max-w-2xl text-lg text-pretty text-muted-foreground">{lead}</p> : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
        {aside ? <div className="relative">{aside}</div> : null}
      </div>
    </section>
  );
}

/** Closing call-to-action drawn as a school blackboard. */
export function CtaBand({ title = "See it with your own school's classes", lead = "A 30-minute walkthrough on Zoom or at your school. We set up a pilot class with your real routine and exam pattern." }: { title?: string; lead?: string }) {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="relative mx-auto max-w-6xl rounded-[2rem] border-[10px] border-[#8b5a2b] bg-[#1f4d3a] px-6 py-12 text-white shadow-2xl sm:px-12 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.4rem] bg-[radial-gradient(80%_60%_at_30%_20%,rgba(255,255,255,.08),transparent)]" />
        <Pencil className="absolute -bottom-7 left-10 rotate-[-4deg]" />
        <div aria-hidden className="absolute right-8 -bottom-[22px] h-3 w-24 rounded-sm bg-white/85 shadow" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="font-hand text-2xl text-sun">Today&apos;s lesson:</p>
            <h2 className="mt-1 font-display text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">{title}</h2>
            <p className="mt-3 text-base text-white/80">{lead}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="h-12 rounded-full bg-sun px-6 text-base text-neutral-900 hover:bg-sun/90" render={<Link href="/contact" />}>Book a demo <ArrowRight /></Button>
            <Button size="lg" variant="outline" className="h-12 rounded-full border-white/50 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white" render={<Link href="/login" />}>Try the live demo</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export type CardColor = "primary" | "coral" | "sky" | "sun" | "leaf" | "grape";
const CARD: Record<CardColor, { bg: string; icon: string }> = {
  primary: { bg: "bg-[color-mix(in_oklch,var(--primary),var(--card)_92%)]", icon: "bg-primary text-primary-foreground" },
  coral: { bg: "bg-[color-mix(in_oklch,var(--coral),var(--card)_91%)]", icon: "bg-coral text-white" },
  sky: { bg: "bg-[color-mix(in_oklch,var(--sky),var(--card)_89%)]", icon: "bg-sky text-white" },
  sun: { bg: "bg-[color-mix(in_oklch,var(--sun),var(--card)_84%)]", icon: "bg-sun text-neutral-900" },
  leaf: { bg: "bg-[color-mix(in_oklch,var(--leaf),var(--card)_89%)]", icon: "bg-leaf text-white" },
  grape: { bg: "bg-[color-mix(in_oklch,var(--grape),var(--card)_91%)]", icon: "bg-grape text-white" },
};
export const CARD_COLORS: CardColor[] = ["primary", "coral", "sky", "sun", "leaf", "grape"];

export function FeatureCard({ icon, title, children, className, color = "primary" }: { icon: ReactNode; title: string; children: ReactNode; className?: string; color?: CardColor }) {
  const c = CARD[color];
  return (
    <div className={cn("rounded-3xl p-6 ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 dark:ring-white/10", c.bg, className)}>
      <div className={cn("flex size-11 rotate-[-4deg] items-center justify-center rounded-2xl shadow-sm [&_svg]:size-5", c.icon)} aria-hidden>{icon}</div>
      <h3 className="mt-4 font-display text-xl font-bold">{title}</h3>
      <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export function CheckList({ items, className, variant = "check" }: { items: ReactNode[]; className?: string; variant?: "check" | "flag" }) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-sm sm:text-base">
          {variant === "flag" ? (
            <svg viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-coral" aria-hidden><circle cx="10" cy="10" r="10" className="fill-coral/15" /><path d="M7 15V5.5M7 6h6l-1.5 2.2L13 10.5H7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-leaf" aria-hidden><circle cx="10" cy="10" r="10" className="fill-leaf/18" /><path d="M6 10.4l2.6 2.6L14 7.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <details key={it.q} className="group rounded-2xl bg-card px-5 py-4 ring-1 ring-black/5 open:shadow-md dark:ring-white/10 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold">
            {it.q}
            <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sun/40 text-lg leading-none text-foreground transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.a}</div>
        </details>
      ))}
    </div>
  );
}

/** Handwritten note pointing at something. */
export function HandNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-hand text-xl leading-tight text-coral", className)}>{children}</p>;
}
