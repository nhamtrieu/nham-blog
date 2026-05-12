import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { getServerAuthSession } from "@/auth";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/auth-routes";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuthSession();

  if (session?.user?.role !== "ADMIN") {
    redirect(ADMIN_LOGIN_PATH);
  }

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
