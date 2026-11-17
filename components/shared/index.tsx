"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint, icon, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  const toneClass = { default: "text-primary bg-primary/10", success: "text-success bg-success/10", warning: "text-warning bg-warning/15", danger: "text-danger bg-danger/10" }[tone];
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        {icon ? <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5", toneClass)} aria-hidden>{icon}</div> : null}
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 font-heading text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";
const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/15 text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/25",
  info: "bg-primary/10 text-primary border-primary/25",
};
export function StatusBadge({ tone = "neutral", children, icon, className }: { tone?: Tone; children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", TONE[tone], className)}>
      {icon}
      {children}
    </Badge>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  P: "success", A: "danger", L: "warning", LV: "info",
  acknowledged: "success", pending: "warning", overdue: "danger",
  DRAFT: "neutral", SUBMITTED: "info", LOCKED: "warning", PUBLISHED: "success", OPEN: "neutral", SUPERSEDED: "neutral",
  approved: "success", rejected: "danger", paid: "success", unpaid: "warning", partial: "warning",
  active: "success", invited: "warning", disabled: "neutral",
};
export function Status({ value }: { value: string }) {
  const t = useTranslations("status");
  const has = t.has(value as never);
  return <StatusBadge tone={STATUS_TONE[value] ?? "neutral"}>{has ? t(value as never) : value}</StatusBadge>;
}

export function EmptyState({ title, description, icon, action }: { title?: string; description?: string; icon?: ReactNode; action?: ReactNode }) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
      <div className="text-muted-foreground [&_svg]:size-8" aria-hidden>{icon ?? <Inbox />}</div>
      <p className="font-medium">{title ?? t("empty")}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useTranslations("common");
  const msg = error instanceof Error ? error.message : t("error");
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-6 py-8 text-center">
      <AlertTriangle className="size-7 text-danger" aria-hidden />
      <p className="text-sm">{msg}</p>
      {onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>{t("retry")}</Button> : null}
    </div>
  );
}

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** Render a TanStack query with loading skeleton and error state with retry. */
export function Async<T>({ query, children, rows }: { query: UseQueryResult<T>; children: (data: T) => ReactNode; rows?: number }) {
  if (query.isPending) return <LoadingBlock rows={rows} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return <>{children(query.data)}</>;
}

export function NativeSelect({ label, value, onChange, options, className, id, disabled, hideLabel }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string; id?: string; disabled?: boolean; hideLabel?: boolean }) {
  const sid = id ?? `sel-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={sid} className={cn("text-xs font-medium text-muted-foreground", hideLabel && "sr-only")}>{label}</label>
      <select
        id={sid}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

/** Table with search, sort and pagination. Turns into cards-friendly horizontal scroll inside its own box on phones. */
export function DataTable<T>({ rows, columns, searchText, pageSize = 15, empty, toolbar, rowKey }: { rows: T[]; columns: Column<T>[]; searchText?: (row: T) => string; pageSize?: number; empty?: ReactNode; toolbar?: ReactNode; rowKey: (row: T) => string }) {
  const t = useTranslations("common");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    let list = rows;
    if (q && searchText) {
      const term = q.toLowerCase();
      list = list.filter((r) => searchText(r).toLowerCase().includes(term));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) list = [...list].sort((a, b) => (col.sortValue!(a) > col.sortValue!(b) ? sort.dir : col.sortValue!(a) < col.sortValue!(b) ? -sort.dir : 0));
    }
    return list;
  }, [rows, q, sort, columns, searchText]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = filtered.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div className="space-y-3">
      {(searchText || toolbar) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          {searchText ? (
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label={t("search")} placeholder={t("search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className="h-9 pl-8" />
            </div>
          ) : null}
          {toolbar ? <div className="flex flex-1 flex-wrap items-end gap-2">{toolbar}</div> : null}
        </div>
      )}
      {filtered.length === 0 ? (
        empty ?? <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={cn("px-3 py-2.5 font-medium whitespace-nowrap", c.className)}>
                    {c.sortValue ? (
                      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))} aria-label={`Sort by ${typeof c.header === "string" ? c.header : c.key}`}>
                        {c.header}
                        {sort?.key === c.key ? sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((r) => (
                <tr key={rowKey(r)} className="border-t align-middle hover:bg-muted/30">
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-3 py-2.5", c.className)}>{c.cell(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{t("results", { count: filtered.length })}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label={t("previous")}><ChevronLeft /></Button>
            <span>{t("page", { page: current + 1, total: pages })}</span>
            <Button variant="outline" size="icon-sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label={t("next")}><ChevronRight /></Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Initials({ name, className }: { name: string; className?: string }) {
  const initials = name.split(" ").filter((p) => !/^(md\.?|dr\.?)$/i.test(p)).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <span aria-hidden className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary", className)}>
      {initials}
    </span>
  );
}

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
