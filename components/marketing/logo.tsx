import { cn } from "@/lib/utils";

/** "Setu" = bridge: an arch joining school and home, with a check for verified acknowledgment. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M5 22c3.5-8 18.5-8 22 0" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9 22v-3.2M16 22v-5.6M23 22v-3.2" stroke="white" strokeWidth="2" strokeLinecap="round" opacity=".7" />
      <path d="M12.2 9.6l2.6 2.6 5-5" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, sub = true }: { className?: string; sub?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-heading leading-none">
        <span className="block text-[17px] font-semibold tracking-tight">ShikkhaSetu</span>
        {sub ? <span className="mt-0.5 block text-[11px] text-muted-foreground">শিক্ষাসেতু</span> : null}
      </span>
    </span>
  );
}
