import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { isWriterSession } from "@/lib/auth/authorization";

export default async function WriteLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuthSession();

  if (!isWriterSession(session)) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/write")}`);
  }

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background text-foreground">
      {children}
    </div>
  );
}
