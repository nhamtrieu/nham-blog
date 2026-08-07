import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { buttonVariants } from "@/components/ui/button";
import { ADMIN_HOME_PATH } from "@/lib/auth/auth-routes";
import { cn } from "@/lib/utils";

export default async function AdminLoginPage() {
  const session = await getServerAuthSession();

  if (session?.user?.role === "ADMIN") {
    redirect(ADMIN_HOME_PATH);
  }

  return (
    <main className="dark relative flex min-h-dvh flex-col bg-background px-6 py-10 text-foreground sm:px-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8">
        <Link
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-auto gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-wide uppercase"
          )}
          href="/"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="size-4 rounded-sm" height={16} src="/logo.png" width={16} />
          Nham Blog Admin
        </Link>

        <div className="w-full">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
