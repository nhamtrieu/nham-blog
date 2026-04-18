import type { ReactNode } from "react";

import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { getServerAuthSession } from "@/auth";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuthSession();

  return (
    <div className="dark min-h-svh bg-background text-foreground">
      <AdminDashboardShell
        userEmail={session?.user?.email ?? "admin@nham.blog"}
        userName={session?.user?.name ?? "Admin"}
      >
        {children}
      </AdminDashboardShell>
    </div>
  );
}
