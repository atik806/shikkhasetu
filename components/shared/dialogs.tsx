"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/** Confirm a sensitive action. With `requireReason`, the user must type a reason (stored in the audit log). */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  requireReason = true,
  minLength = 5,
  destructive,
  pending,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  requireReason?: boolean;
  minLength?: number;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: (reason: string) => void;
  children?: ReactNode;
}) {
  const t = useTranslations("common");
  const [reason, setReason] = useState("");
  const ok = !requireReason || reason.trim().length >= minLength;
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setReason(""); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {requireReason ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reason-input" className="text-sm font-medium">{t("reasonRequired")}</label>
            <Textarea id="reason-input" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            {!ok && reason.length > 0 ? <p className="text-xs text-muted-foreground">At least {minLength} characters.</p> : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={!ok || pending} onClick={() => onConfirm(reason.trim())}>
            {pending ? t("saving") : confirmLabel ?? t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Large, phone-friendly code input (PIN / OTP). */
export function CodeInput({ id, length, value, onChange, label, masked, autoFocus }: { id: string; length: number; value: string; onChange: (v: string) => void; label: string; masked?: boolean; autoFocus?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  // dialogs move focus to their popup first; focus the code box right after
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => ref.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [autoFocus]);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete={masked ? "off" : "one-time-code"}
        type={masked ? "password" : "text"}
        maxLength={length}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        className="h-12 w-full rounded-lg border border-input bg-background text-center font-mono text-2xl tracking-[0.5em] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />
    </div>
  );
}
