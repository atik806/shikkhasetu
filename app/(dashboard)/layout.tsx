import { AppShell } from "@/components/shell/app-shell";
import { DataGate } from "@/components/data-gate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataGate>
      <AppShell>{children}</AppShell>
    </DataGate>
  );
}
