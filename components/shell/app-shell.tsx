"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { LogoMark } from "@/components/marketing/logo";
import { Languages, LogOut, Menu, Moon, MoreHorizontal, Sun, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Initials } from "@/components/shared";
import { NotificationBell } from "./notification-bell";
import { DevPanel } from "./dev-panel";
import { NAV, MOBILE_TABS, type NavItem } from "@/lib/nav";
import { HOME_FOR_ROLE, rolesForPath } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/session";
import { useMe } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

function isActive(pathname: string, href: string) {
  const roots = ["/admin", "/teacher", "/parent", "/student", "/gate"];
  return roots.includes(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ items, onNavigate, isClassTeacher }: { items: NavItem[]; onNavigate?: () => void; isClassTeacher: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const main = items.filter((i) => !i.classTeacherOnly);
  const ct = items.filter((i) => i.classTeacherOnly);
  const render = (i: NavItem) => {
    const active = isActive(pathname, i.href);
    return (
      <li key={i.href}>
        <Link
          href={i.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors", active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
        >
          <i.icon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{t(i.label as never)}</span>
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Main">
      <ul className="space-y-0.5">{main.map(render)}</ul>
      {isClassTeacher && ct.length > 0 ? (
        <>
          <p className="mt-5 mb-1.5 px-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t("classTeacherGroup")}</p>
          <ul className="space-y-0.5">{ct.map(render)}</ul>
        </>
      ) : null}
    </nav>
  );
}

function Brand() {
  const t = useTranslations("app");
  return (
    <Link href="/" className="flex items-center gap-2 font-heading font-semibold">
      <LogoMark />
      <span className="leading-tight">
        {t("name")}
        <span className="block text-[11px] font-normal text-muted-foreground">{t("school")}</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const { userId, role, setRole, clear, locale, setLocale } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const me = useMe();
  const [open, setOpen] = useState(false);

  // client-side guard (proxy.ts already redirected; this covers stale cookies / role switches)
  const allowed = rolesForPath(pathname);
  const mismatch = Boolean(role && allowed && !allowed.includes(role));
  useEffect(() => {
    if (!userId || !role) {
      clear();
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (mismatch) {
      router.replace(`/forbidden?from=${encodeURIComponent(pathname)}`);
    }
  }, [userId, role, mismatch, pathname, router, clear]);

  if (!userId || !role || mismatch) return null;

  const items = NAV[role];
  const isCT = (me.data?.classTeacherSectionIds.length ?? 0) > 0;
  const tabs = MOBILE_TABS[role];

  const switchRole = (r: Role) => {
    setRole(r);
    qc.clear();
    router.push(HOME_FOR_ROLE[r]);
  };
  const signOut = () => {
    clear();
    qc.clear();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">Skip to content</a>
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-sidebar px-3 py-4 lg:flex">
        <div className="px-1.5"><Brand /></div>
        <NavList items={items} isClassTeacher={isCT} />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 overflow-y-auto p-3">
          <SheetHeader className="px-1.5"><SheetTitle><Brand /></SheetTitle></SheetHeader>
          <NavList items={items} onNavigate={() => setOpen(false)} isClassTeacher={isCT} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></Button>
          <div className="lg:hidden"><span className="font-heading text-sm font-semibold">{t("app.name")}</span></div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setLocale(locale === "en" ? "bn" : "en")} aria-label={t("common.language")}>
              <Languages /> <span className="hidden sm:inline">{locale === "en" ? "বাংলা" : "English"}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label={t("common.theme")}>
              {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Account menu" />}>
                <Initials name={me.data?.name ?? "?"} className="size-7" />
                <span className="hidden max-w-36 truncate text-left text-xs leading-tight md:block">
                  {me.data?.name}
                  <span className="block text-muted-foreground">{t(`roles.${role}` as never)}{isCT ? ` · ${t("roles.class_teacher")}` : ""}</span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{me.data?.name}</DropdownMenuLabel>
                </DropdownMenuGroup>
                {(me.data?.roles.length ?? 0) > 1 ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">{t("common.switchRole")}</DropdownMenuLabel>
                      {me.data!.roles.map((r) => (
                        <DropdownMenuItem key={r} onClick={() => switchRole(r)} disabled={r === role}>
                          <UserRound /> {t(`roles.${r}` as never)} {r === role ? "✓" : ""}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut /> {t("common.signOut")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main id="main" className={cn("mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6", tabs && "pb-24 lg:pb-6")}>{children}</main>

        {tabs ? (
          <nav aria-label="Quick" className="no-print fixed inset-x-0 bottom-0 z-30 grid border-t bg-background/95 backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
            {tabs.map((href) => {
              const item = items.find((i) => i.href === href)!;
              const active = isActive(pathname, href);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-primary" : "text-muted-foreground")}>
                  <item.icon className="size-5" aria-hidden />
                  <span className="truncate">{t(`nav.${item.label}` as never)}</span>
                </Link>
              );
            })}
            <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground">
              <MoreHorizontal className="size-5" aria-hidden />
              <span>More</span>
            </button>
          </nav>
        ) : null}
      </div>
      <DevPanel />
    </div>
  );
}
