"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="font-heading text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      <button type="button" onClick={reset} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Try again</button>
    </div>
  );
}
