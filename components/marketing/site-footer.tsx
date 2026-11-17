import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { Logo } from "./logo";
import { Star, Wave } from "./doodles";
import { FOOTER_LINKS, SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="relative mt-auto">
      <Wave className="text-cream" />
      <div className="bg-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 pb-14 sm:px-6 lg:grid-cols-[1.3fr_2fr]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              Built in Bangladesh for Bangladeshi schools. Results that reach parents, attendance they can see the same morning.
            </p>
            <p className="font-hand text-2xl text-coral" lang="bn">মনের আনন্দে স্কুলে যাই ✏️</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Mail className="size-4" aria-hidden /><a className="hover:text-foreground" href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li className="flex items-center gap-2"><MapPin className="size-4" aria-hidden />{SITE.city}</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_LINKS.map((col) => (
              <div key={col.title}>
                <p className="font-display text-base font-bold">{col.title}</p>
                <ul className="mt-3 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}><Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-foreground/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-center gap-2"><Star className="size-4" /> © 2026 ShikkhaSetu. All rights reserved.</p>
            <p>Made for NCTB-curriculum schools · বাংলা ও English · Photos: <a className="underline" href="https://www.pexels.com/license/">Pexels</a></p>
          </div>
        </div>
      </div>
    </footer>
  );
}
