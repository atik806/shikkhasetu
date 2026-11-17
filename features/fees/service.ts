"use client";
import type { ID, Payment } from "@/types";
import { audit, command, notify, query, userName } from "@/lib/services/runtime";
import { assert, canViewStudent, isAdminRole } from "@/lib/auth/scope";
import { randomCode, uid } from "@/lib/codes";
import { nowISO, today } from "@/lib/time";
import { sectionLabel } from "@/lib/services/lookups";
import type { MockDB } from "@/lib/mock/schema";

function invoiceTotal(i: { items: { amount: number }[]; discount: number }) {
  return i.items.reduce((s, x) => s + x.amount, 0) - i.discount;
}

function invoiceView(db: MockDB, i: MockDB["invoices"][number]) {
  const total = invoiceTotal(i);
  return { ...i, total, due: total - i.paid, overdue: i.status !== "paid" && i.dueDate < today(), items: i.items.map((x) => ({ ...x, name: db.feeHeads.find((h) => h.id === x.feeHeadId)?.name ?? "" })), payments: db.payments.filter((p) => p.invoiceId === i.id) };
}

export const mockFeeService = {
  async structure() {
    return query(({ db, actor }) => {
      assert(isAdminRole(actor.role));
      return { heads: db.feeHeads, classes: db.classes, structures: db.feeStructures };
    });
  },
  async setFee(classId: ID, feeHeadId: ID, amount: number) {
    return command(({ db, actor }) => {
      assert(isAdminRole(actor.role));
      assert(amount >= 0, "Amount cannot be negative.");
      const f = db.feeStructures.find((x) => x.classId === classId && x.feeHeadId === feeHeadId);
      const before = f?.amount;
      if (f) f.amount = amount;
      else db.feeStructures.push({ id: uid("fs"), classId, feeHeadId, amount });
      audit(db, actor.userId, "fees.structure", "fee_structure", `${classId}:${feeHeadId}`, { before, after: amount });
    });
  },
  async summary() {
    return query(({ db, actor }) => {
      assert(isAdminRole(actor.role));
      const month = today().slice(0, 7);
      const collected = db.payments.filter((p) => p.at.slice(0, 7) === month).reduce((s, p) => s + p.amount, 0);
      const dueRows = db.invoices.filter((i) => i.status !== "paid");
      const outstanding = dueRows.reduce((s, i) => s + invoiceTotal(i) - i.paid, 0);
      const byMethod = (["bkash", "nagad", "rocket", "card", "cash"] as Payment["method"][]).map((m) => ({ method: m, amount: db.payments.filter((p) => p.method === m && p.at.slice(0, 7) === month).reduce((s, p) => s + p.amount, 0) }));
      return { collected, outstanding, overdueCount: dueRows.filter((i) => i.dueDate < today()).length, byMethod };
    });
  },
  async dueList(sectionId?: ID | "all") {
    return query(({ db, actor }) => {
      assert(isAdminRole(actor.role));
      return db.invoices
        .filter((i) => i.status !== "paid")
        .map((i) => ({ inv: i, st: db.students.find((s) => s.id === i.studentId)! }))
        .filter(({ st }) => !sectionId || sectionId === "all" || st.sectionId === sectionId)
        .map(({ inv, st }) => ({ ...invoiceView(db, inv), studentName: st.name, studentCode: st.studentId, sectionLabel: sectionLabel(db, st.sectionId) }))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    });
  },
  async studentInvoices(studentId: ID) {
    return query(({ db, actor }) => {
      assert(canViewStudent(actor, studentId, db));
      return db.invoices.filter((i) => i.studentId === studentId).map((i) => invoiceView(db, i)).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    });
  },
  /** Mock payment gateway. A real integration redirects to bKash/Nagad and confirms by webhook. */
  async pay(input: { invoiceId: ID; method: Payment["method"]; walletNumber?: string }) {
    return command(({ db, actor }) => {
      const inv = db.invoices.find((i) => i.id === input.invoiceId)!;
      assert(canViewStudent(actor, inv.studentId, db));
      assert(actor.role === "parent" || isAdminRole(actor.role), "Only a guardian or the office can pay.");
      assert(input.method !== "cash" || isAdminRole(actor.role), "Cash is recorded by the office.");
      assert(inv.status !== "paid", "Already paid.");
      const amount = invoiceTotal(inv) - inv.paid;
      const p: Payment = { id: uid("pay"), invoiceId: inv.id, studentId: inv.studentId, amount, method: input.method, trxId: `${input.method.toUpperCase().slice(0, 3)}${randomCode(10)}`, paidBy: actor.userId, at: nowISO() };
      db.payments.push(p);
      inv.paid += amount;
      inv.status = "paid";
      const st = db.students.find((s) => s.id === inv.studentId)!;
      notify(db, { userIds: st.guardians.map((g) => g.guardianUserId), type: "payment", title: `Payment received: ৳${amount.toLocaleString("en-IN")}`, body: `${inv.title} for ${st.name}. Transaction ${p.trxId}.`, studentId: st.id, sms: true, link: "/parent/fees" });
      audit(db, actor.userId, "fees.payment", "invoice", inv.id, { after: { amount, method: input.method, trx: p.trxId } });
      return p;
    });
  },
  async waive(input: { invoiceId: ID; amount: number; reason: string }) {
    return command(({ db, actor }) => {
      assert(isAdminRole(actor.role));
      const inv = db.invoices.find((i) => i.id === input.invoiceId)!;
      assert(input.amount > 0 && input.amount <= invoiceTotal(inv) - inv.paid, "Invalid amount.");
      inv.discount += input.amount;
      if (invoiceTotal(inv) - inv.paid <= 0) inv.status = "paid";
      audit(db, actor.userId, "fees.waiver", "invoice", inv.id, { after: { amount: input.amount }, reason: input.reason });
    });
  },
  async receipt(paymentId: ID) {
    return query(({ db, actor }) => {
      const p = db.payments.find((x) => x.id === paymentId)!;
      assert(canViewStudent(actor, p.studentId, db));
      const inv = db.invoices.find((i) => i.id === p.invoiceId)!;
      const st = db.students.find((s) => s.id === p.studentId)!;
      return { payment: p, invoice: invoiceView(db, inv), student: st.name, studentCode: st.studentId, section: sectionLabel(db, st.sectionId), school: db.school.name, paidBy: userName(db, p.paidBy) };
    });
  },
};

export type FeeService = typeof mockFeeService;
