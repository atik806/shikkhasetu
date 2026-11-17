import Link from "next/link";
import { Logo } from "@/components/marketing/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Link href="/" aria-label="ShikkhaSetu home"><Logo /></Link>
      <p className="mt-6 font-heading text-6xl font-semibold text-primary">404</p>
      <h1 className="font-heading text-2xl font-semibold">This page does not exist</h1>
      <p className="max-w-sm text-sm text-muted-foreground">The link may be old or mistyped. If you scanned a result card, use the code printed under the QR on the verify page.</p>
      <div className="flex gap-4 text-sm font-medium">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">Home</Link>
        <Link href="/contact" className="text-primary underline-offset-4 hover:underline">Contact</Link>
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">Sign in</Link>
      </div>
    </div>
  );
}
