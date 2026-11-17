"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { useSession } from "@/lib/auth/session";
import { HOME_FOR_ROLE } from "@/lib/auth/permissions";
import { fmtDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const t = useTranslations("common");
  const router = useRouter();
  const role = useSession((s) => s.role);
  const q = useAppQuery(["notifications"], () => services.notifications.list(), { refetchInterval: 15_000 });
  const markRead = useAction((ids: string[] | "all") => services.notifications.markRead(ids));
  const unread = q.data?.filter((n) => !n.readAt).length ?? 0;

  const open = (id: string, link?: string) => {
    markRead.mutate([id]);
    if (!link || !role) return;
    // links like "/notices" are role-relative
    const href = link.startsWith("/notices") ? `${HOME_FOR_ROLE[role]}/notices` : link;
    if (href.startsWith(HOME_FOR_ROLE[role])) router.push(href);
  };

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={`${t("notifications")}${unread ? ` (${unread} unread)` : ""}`} />}>
        <Bell />
        {unread > 0 ? <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span> : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">{t("notifications")}</p>
          {unread > 0 ? <Button variant="link" size="xs" onClick={() => markRead.mutate("all")}>{t("markAllRead")}</Button> : null}
        </div>
        <ul className="max-h-[60vh] overflow-y-auto">
          {(q.data ?? []).length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t("noNotifications")}</li> : null}
          {(q.data ?? []).slice(0, 40).map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => open(n.id, n.link)} className={cn("w-full border-b px-3 py-2.5 text-left hover:bg-muted/50", !n.readAt && "bg-primary/5")}>
                <p className={cn("text-sm", !n.readAt && "font-semibold")}>{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {fmtDateTime(n.createdAt)}
                  {n.channels.includes("sms") ? " · SMS sent" : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
