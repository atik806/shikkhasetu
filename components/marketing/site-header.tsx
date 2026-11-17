"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { NAV_LINKS } from "@/lib/site";
import { cn } from "@/lib/utils";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // close the mobile menu on navigation
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <header className={cn("sticky top-0 z-40 transition-[background,box-shadow]", scrolled || open ? "bg-background/90 shadow-[0_1px_0_var(--border)] backdrop-blur" : "bg-transparent")}>
      <div aria-hidden className="h-1.5 bg-[linear-gradient(90deg,var(--primary)_0_20%,var(--sun)_20%_40%,var(--coral)_40%_60%,var(--sky)_60%_80%,var(--leaf)_80%_100%)]" />
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="ShikkhaSetu home"><Logo /></Link>
        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={cn("rounded-full px-3.5 py-2 text-sm font-medium transition-colors", active ? "bg-sun/35 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Button variant="ghost" className="rounded-full" render={<Link href="/login" />}>Sign in</Button>
          <Button className="h-10 rounded-full px-5" render={<Link href="/contact" />}>Book a demo</Button>
        </div>
        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t px-4 pb-5 lg:hidden">
          <ul className="py-2">
            {NAV_LINKS.map((l) => (
              <li key={l.href}><Link href={l.href} className="block rounded-xl px-3 py-3 font-display text-lg font-semibold hover:bg-muted">{l.label}</Link></li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11 rounded-full" render={<Link href="/login" />}>Sign in</Button>
            <Button className="h-11 rounded-full" render={<Link href="/contact" />}>Book a demo</Button>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
