"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, LogIn } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/shared";
import { CodeInput } from "@/components/shared/dialogs";
import { DevPanel } from "@/components/shell/dev-panel";
import { services } from "@/lib/services";
import { useSession } from "@/lib/auth/session";
import { HOME_FOR_ROLE, rolesForPath } from "@/lib/auth/permissions";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DEMO_PIN } from "@/lib/mock/seed";
import type { LoginTab } from "@/features/auth/service";
import type { Role } from "@/types";

const schema = z.object({ identifier: z.string().min(3, "Required"), password: z.string().min(1, "Required") });

function LoginInner() {
  const t = useTranslations("login");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const setSession = useSession((s) => s.setSession);
  const { locale, setLocale } = useSession();
  const [tab, setTab] = useState<LoginTab>("parent");
  const [busy, setBusy] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { identifier: "", password: "" } });

  const go = (userId: string, role: Role) => {
    setSession(userId, role);
    qc.clear();
    const next = params.get("next");
    const allowed = next ? rolesForPath(next) : null;
    router.replace(next && allowed?.includes(role) ? next : HOME_FOR_ROLE[role]);
  };

  const onSubmit = form.handleSubmit(async (v) => {
    setBusy(true);
    try {
      const r = await services.auth.login({ tab, identifier: v.identifier, password: v.password });
      go(r.userId, r.role);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  });

  const demo = async (userId: string, role?: Role) => {
    setBusy(true);
    try {
      const r = await services.auth.demoLogin(userId, role);
      go(r.userId, r.role);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  const idLabel = tab === "student" ? t("studentId") : tab === "parent" ? t("phone") : t("phoneOrEmail");
  const DEMOS: { label: string; id: string; role?: Role; hint: string }[] = [
    { label: t("demoParent"), id: DEMO_ACCOUNTS.parentTwoKids, hint: "Md. Abdul Karim · 01711000100" },
    { label: t("demoMother"), id: DEMO_ACCOUNTS.parentMother, hint: "Rokeya Begum · 01711000101" },
    { label: t("demoClassTeacher"), id: DEMO_ACCOUNTS.classTeacher, hint: "Mahmudul Hasan · 01711000010" },
    { label: t("demoTeacherParent"), id: DEMO_ACCOUNTS.teacherParent, role: "teacher", hint: "Farhana Yasmin · switch role in the menu" },
    { label: t("demoAdmin"), id: DEMO_ACCOUNTS.admin, hint: "Dr. Nasrin Akter · 01711000001" },
    { label: t("demoStudent"), id: DEMO_ACCOUNTS.student, hint: "Rahim Karim · DMHS-26-08101" },
    { label: t("demoGate"), id: DEMO_ACCOUNTS.gate, hint: "Abdul Jalil · 01711000005" },
  ];

  return (
    <div className="mx-auto grid min-h-dvh max-w-5xl items-start gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
      <div className="lg:col-span-2 flex items-center justify-between">
        <Link href="/" aria-label="ShikkhaSetu home"><Logo /></Link>
        <Button variant="ghost" size="sm" onClick={() => setLocale(locale === "en" ? "bn" : "en")}>{locale === "en" ? "বাংলা" : "English"}</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => { setTab(v as LoginTab); form.reset(); }} className="mb-4">
            <TabsList className="w-full">
              <TabsTrigger value="parent">{t("parent")}</TabsTrigger>
              <TabsTrigger value="student">{t("student")}</TabsTrigger>
              <TabsTrigger value="staff">{t("staff")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label={idLabel} htmlFor="identifier" error={form.formState.errors.identifier?.message}>
              <Input id="identifier" autoComplete="username" inputMode={tab === "parent" ? "tel" : "text"} placeholder={tab === "parent" ? "01XXXXXXXXX" : tab === "student" ? "DMHS-26-08101" : ""} {...form.register("identifier")} />
            </Field>
            <Field label={t("password")} htmlFor="password" error={form.formState.errors.password?.message}>
              <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
            </Field>
            <Button type="submit" className="h-10 w-full" disabled={busy}><LogIn /> {t("signIn")}</Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">{t("noSignup")}</p>
          {tab === "parent" ? (
            <Button variant="link" size="sm" className="mt-1 px-0" onClick={() => setActivateOpen(true)}><KeyRound /> {t("activate")}</Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">{t("demoTitle")}</CardTitle>
          <CardDescription>{t("demoHint", { password: DEMO_PASSWORD, pin: DEMO_PIN })}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {DEMOS.map((d) => (
            <button key={d.id + (d.role ?? "")} type="button" disabled={busy} onClick={() => demo(d.id, d.role)} className="rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50">
              <span className="block text-sm font-medium">{d.label}</span>
              <span className="block text-xs text-muted-foreground">{d.hint}</span>
            </button>
          ))}
          <p className="text-xs text-muted-foreground sm:col-span-2">{t("featurePhoneNote")}</p>
        </CardContent>
      </Card>
      <ActivateDialog open={activateOpen} onOpenChange={setActivateOpen} />
      <DevPanel />
      <span className="sr-only">{tc("loading")}</span>
    </div>
  );
}

function ActivateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [slip, setSlip] = useState("");
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try {
      const r = await services.school.remoteActivationStart({ phone, slipCode: slip });
      setUserId(r.userId);
      setStep(2);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const finish = async () => {
    setBusy(true);
    try {
      await services.school.remoteActivationComplete({ userId, code, password, pin });
      toast.success("Account activated. You can sign in now.");
      onOpenChange(false);
      setStep(1);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Activate a parent account</DialogTitle>
          <DialogDescription>
            The recommended way is <strong>at the school office</strong> with your activation slip. Activating from home works only if your school allows it, and the school will be shown that it was done remotely.
          </DialogDescription>
        </DialogHeader>
        {step === 1 ? (
          <div className="space-y-3">
            <Field label="Registered mobile number" htmlFor="act-phone"><Input id="act-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" /></Field>
            <Field label="Code on your activation slip" htmlFor="act-slip"><Input id="act-slip" value={slip} onChange={(e) => setSlip(e.target.value.toUpperCase())} placeholder="ABCD-EFGH" /></Field>
            <Button className="w-full" onClick={start} disabled={busy || !phone || !slip}>Send code to my phone</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <CodeInput id="act-otp" length={6} value={code} onChange={setCode} label="6-digit code from SMS" autoFocus />
            <Field label="New password (8+ characters)" htmlFor="act-pw"><Input id="act-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            <CodeInput id="act-pin" length={6} value={pin} onChange={setPin} label="Parent PIN (4–6 digits) — never tell your child" masked />
            <Button className="w-full" onClick={finish} disabled={busy || code.length !== 6 || password.length < 8 || pin.length < 4}>Activate</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
