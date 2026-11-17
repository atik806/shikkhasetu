"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/session";
import { HOME_FOR_ROLE } from "@/lib/auth/permissions";

export default function Forbidden() {
  const t = useTranslations("common");
  const role = useSession((s) => s.role);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <ShieldX className="size-12 text-danger" aria-hidden />
      <p className="font-heading text-sm font-semibold text-muted-foreground">403</p>
      <h1 className="font-heading text-2xl font-semibold">{t("forbidden")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t("forbiddenHint")}</p>
      <Button render={<Link href={role ? HOME_FOR_ROLE[role] : "/login"} />}>{t("goHome")}</Button>
    </div>
  );
}
