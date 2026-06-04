"use client";

import { AppProvider } from "@/lib/context";
import { ShellV2 } from "@/components/dashboard/v2/shell";
import { EntranceGuard } from "@/components/ui/entrance-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <EntranceGuard>
        <ShellV2>{children}</ShellV2>
      </EntranceGuard>
    </AppProvider>
  );
}
