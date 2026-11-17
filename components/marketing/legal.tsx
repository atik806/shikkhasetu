import type { ReactNode } from "react";

/** Typography wrapper for long legal text (no typography plugin needed). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
      <div className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
        Draft for review. This text is a starting point and must be checked by a lawyer familiar with Bangladeshi law before launch.
      </div>
      <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:space-y-2">
        {children}
      </div>
    </article>
  );
}
