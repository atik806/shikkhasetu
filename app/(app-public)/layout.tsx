import { DataGate } from "@/components/data-gate";

/** Login, verification and 403 read the browser database, so they wait for it. */
export default function AppPublicLayout({ children }: { children: React.ReactNode }) {
  return <DataGate>{children}</DataGate>;
}
