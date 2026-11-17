"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ShieldCheck, Signature } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CodeInput } from "@/components/shared/dialogs";
import { services } from "@/lib/services";

/**
 * Parent acknowledgment: PIN → OTP to the school-registered phone → recorded.
 * Replaces (or sits beside) the paper signature.
 */
export function AckFlow({ resultVersionId, childName, hideTrigger, onStart }: { resultVersionId: string; childName: string; hideTrigger?: boolean; onStart?: () => void }) {
  const t = useTranslations("ack");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"pin" | "otp" | "done">("pin");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [comment, setComment] = useState("");
  const [meeting, setMeeting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("pin");
    setPin("");
    setOtp("");
    setComment("");
    setMeeting(false);
    setError(null);
  };

  const submitPin = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await services.acks.startAck({ resultVersionId, pin });
      if (!r.ok) {
        setError(r.error);
        setPin("");
      } else {
        setSentTo(r.sentTo);
        setStep("otp");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const fullComment = [comment.trim(), meeting ? "I would like to meet the class teacher." : ""].filter(Boolean).join(" ");
      const r = await services.acks.confirmAck({ resultVersionId, code: otp, comment: fullComment || undefined });
      if (!r.ok) {
        setError(r.error);
        setOtp("");
      } else {
        setStep("done");
        await qc.invalidateQueries();
      }
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!hideTrigger ? (
        <Button size="lg" className="h-12 w-full text-base sm:w-auto" onClick={() => { reset(); setOpen(true); onStart?.(); }}>
          <Signature /> {t("button")}
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {step === "pin" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> {t("pinTitle")}</DialogTitle>
                <DialogDescription>{t("pinHint")}</DialogDescription>
              </DialogHeader>
              <CodeInput id="ack-pin" length={6} value={pin} onChange={setPin} label={`PIN — ${childName}`} masked autoFocus />
              {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
              <p className="text-xs text-muted-foreground">{t("otherGuardianNotified")}</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
                <Button onClick={submitPin} disabled={pin.length < 4 || busy}>{busy ? tc("loading") : tc("next")}</Button>
              </DialogFooter>
            </>
          ) : step === "otp" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("otpTitle")}</DialogTitle>
                <DialogDescription>{t("otpHint", { phone: sentTo })}</DialogDescription>
              </DialogHeader>
              <CodeInput id="ack-otp" length={6} value={otp} onChange={setOtp} label="Code" autoFocus />
              {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ack-comment" className="text-sm font-medium">{t("comment")}</label>
                <Textarea id="ack-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={300} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={meeting} onCheckedChange={(v) => setMeeting(Boolean(v))} /> {t("meeting")}
              </label>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("pin")}>{tc("back")}</Button>
                <Button onClick={submitOtp} disabled={otp.length !== 6 || busy}>{busy ? tc("loading") : tc("confirm")}</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle2 className="size-12 text-success" aria-hidden />
                <DialogTitle>{t("done")}</DialogTitle>
                <DialogDescription>{t("doneHint")}</DialogDescription>
              </div>
              <DialogFooter>
                {meeting ? <Button variant="outline" render={<Link href="/parent/meetings" />}>Book a meeting</Button> : null}
                <Button onClick={() => setOpen(false)}>{tc("close")}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
