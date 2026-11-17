import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Hand-drawn school doodles (decorative — hidden from screen readers). */

export function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-8 text-sun", className)}>
      <path d="M20 3l4.9 10.6 11.6 1.3-8.6 7.8 2.4 11.4L20 28.3 9.7 34.1l2.4-11.4L3.5 14.9l11.6-1.3z" fill="currentColor" stroke="var(--foreground)" strokeOpacity=".25" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6 text-coral", className)}>
      <path d="M12 2c.8 5 2.2 6.6 8 8-5.8 1.4-7.2 3-8 8-.8-5-2.2-6.6-8-8 5.8-1.4 7.2-3 8-8z" fill="currentColor" />
    </svg>
  );
}

export function Pencil({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 24" aria-hidden className={cn("h-6 w-28", className)}>
      <rect x="18" y="4" width="84" height="16" rx="2" fill="var(--sun)" stroke="var(--foreground)" strokeOpacity=".3" />
      <rect x="18" y="4" width="84" height="5" fill="#fff" opacity=".35" />
      <rect x="102" y="4" width="12" height="16" rx="3" fill="var(--coral)" />
      <rect x="96" y="4" width="7" height="16" fill="#cbd5e1" />
      <path d="M18 4L2 12l16 8z" fill="#f5deb3" stroke="var(--foreground)" strokeOpacity=".3" />
      <path d="M7 9.5L2 12l5 2.5z" fill="var(--foreground)" />
    </svg>
  );
}

export function PaperPlane({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" aria-hidden className={cn("h-10 w-14 text-sky", className)}>
      <path d="M2 22L62 2 44 44 30 30z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M62 2L30 30l-4 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function DashedPath({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 80" aria-hidden className={cn("h-16 w-40 text-foreground/25", className)}>
      <path d="M2 70C40 70 50 10 100 20s60 40 96 10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" />
    </svg>
  );
}

/** Round "grade sticker" like the ones teachers put on copies. */
export function GradeSticker({ grade = "A+", label = "Great work!", className }: { grade?: string; label?: string; className?: string }) {
  return (
    <div aria-hidden className={cn("flex size-24 rotate-[-10deg] flex-col items-center justify-center rounded-full border-4 border-dashed border-white bg-coral text-white shadow-lg ring-4 ring-coral", className)}>
      <span className="font-display text-3xl leading-none font-extrabold">{grade}</span>
      <span className="font-hand text-sm leading-none">{label}</span>
    </div>
  );
}

/** Sticky note with handwriting. */
export function StickyNote({ children, color = "sun", className }: { children: ReactNode; color?: "sun" | "sky" | "leaf" | "coral"; className?: string }) {
  const bg = { sun: "bg-[color-mix(in_oklch,var(--sun),white_45%)]", sky: "bg-[color-mix(in_oklch,var(--sky),white_60%)]", leaf: "bg-[color-mix(in_oklch,var(--leaf),white_60%)]", coral: "bg-[color-mix(in_oklch,var(--coral),white_60%)]" }[color];
  return (
    <div className={cn("relative w-52 rotate-2 p-4 pt-6 font-hand text-xl leading-snug text-neutral-800 shadow-md", bg, className)}>
      <span aria-hidden className="absolute -top-2 left-1/2 h-5 w-16 -translate-x-1/2 rotate-[-3deg] bg-white/60 shadow-sm" />
      {children}
    </div>
  );
}

/** Photo printed like a snapshot taped into a scrapbook. */
export function SnapshotPhoto({ src, alt, caption, className, rotate = "rotate-2", sizes = "(min-width: 1024px) 30vw, 80vw", priority, aspect = "aspect-[4/3]" }: { src: string; alt: string; caption?: string; className?: string; rotate?: string; sizes?: string; priority?: boolean; aspect?: string }) {
  return (
    <figure className={cn("relative bg-white p-2.5 pb-3 shadow-xl ring-1 ring-black/5", rotate, className)}>
      <span aria-hidden className="absolute -top-3 left-6 z-10 h-6 w-20 rotate-[-6deg] bg-[color-mix(in_oklch,var(--sun),white_55%)] opacity-90 shadow-sm" />
      <div className={cn("relative overflow-hidden", aspect)}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
      {caption ? <figcaption className="mt-2 text-center font-hand text-lg leading-tight text-neutral-700">{caption}</figcaption> : null}
    </figure>
  );
}

/** Rounded photo for content sections. */
export function RoundPhoto({ src, alt, className, sizes = "(min-width: 1024px) 45vw, 92vw", aspect = "aspect-[4/3]", priority }: { src: string; alt: string; className?: string; sizes?: string; aspect?: string; priority?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-black/5", aspect, className)}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}

/** Wavy edge between sections. */
export function Wave({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden className={cn("block h-10 w-full sm:h-14", flip && "rotate-180", className)}>
      <path d="M0 30c120-30 240-30 360 0s240 30 360 0 240-30 360 0 240 30 360 0v30H0z" fill="currentColor" />
    </svg>
  );
}
