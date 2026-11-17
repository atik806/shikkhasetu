"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared";
import { isValidBdPhone } from "@/lib/phone";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  role: z.string().min(1),
  school: z.string().trim().min(2, "Please enter your school's name"),
  phone: z.string().refine(isValidBdPhone, "Enter a Bangladeshi mobile number, e.g. 01712345678"),
  email: z.union([z.literal(""), z.string().email("That email doesn't look right")]),
  students: z.string().min(1),
  message: z.string().max(1000).optional(),
});
type Values = z.infer<typeof schema>;

/**
 * Demo request form. There is no backend yet: the request is kept in this browser only.
 * When the API exists, POST it there instead of localStorage.
 */
export function ContactForm() {
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", role: "Head teacher", school: "", phone: "", email: "", students: "300–800", message: "" } });
  const e = form.formState.errors;
  const submit = form.handleSubmit(async (v) => {
    try {
      const list = JSON.parse(localStorage.getItem("shikkhasetu-demo-requests") ?? "[]") as unknown[];
      localStorage.setItem("shikkhasetu-demo-requests", JSON.stringify([...list, { ...v, at: new Date().toISOString() }]));
    } catch {
      // storage may be blocked (private mode) — the confirmation is still shown
    }
    setSent(v.name.split(" ")[0]);
  });

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center">
        <CheckCircle2 className="size-12 text-success" aria-hidden />
        <h2 className="font-heading text-xl font-semibold">Thank you, {sent}.</h2>
        <p className="max-w-sm text-sm text-muted-foreground">We have your request and will call you to fix a time for the demo.</p>
        <p className="text-xs text-muted-foreground">(Preview build: the request is saved in this browser only.)</p>
        <Button variant="outline" onClick={() => { form.reset(); setSent(null); }}>Send another</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2 sm:p-8">
      <Field label="Your name" htmlFor="c-name" error={e.name?.message}><Input id="c-name" autoComplete="name" aria-invalid={Boolean(e.name)} {...form.register("name")} /></Field>
      <Field label="Your role" htmlFor="c-role">
        <select id="c-role" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm dark:bg-input/30" {...form.register("role")}>
          {["Head teacher", "Assistant head teacher", "Teacher", "Office / accounts", "Managing committee", "Parent", "Other"].map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="School name" htmlFor="c-school" error={e.school?.message}><Input id="c-school" aria-invalid={Boolean(e.school)} {...form.register("school")} /></Field>
      <Field label="Number of students" htmlFor="c-students">
        <select id="c-students" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm dark:bg-input/30" {...form.register("students")}>
          {["Under 300", "300–800", "800–2,000", "Over 2,000", "Several campuses"].map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Mobile number" htmlFor="c-phone" error={e.phone?.message}><Input id="c-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" aria-invalid={Boolean(e.phone)} {...form.register("phone")} /></Field>
      <Field label="Email (optional)" htmlFor="c-email" error={e.email?.message}><Input id="c-email" type="email" autoComplete="email" aria-invalid={Boolean(e.email)} {...form.register("email")} /></Field>
      <div className="sm:col-span-2">
        <Field label="Anything we should know? (optional)" htmlFor="c-msg"><Textarea id="c-msg" rows={4} placeholder="e.g. two shifts, Bangla and English versions, most parents use basic phones…" {...form.register("message")} /></Field>
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">We use your details only to arrange the demo.</p>
        <Button type="submit" size="lg" className="h-11" disabled={form.formState.isSubmitting}><Send /> Request a demo</Button>
      </div>
    </form>
  );
}
