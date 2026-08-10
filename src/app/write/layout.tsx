import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { isWriterSession } from "@/lib/auth/authorization";
import { isVerificationGraceExpired } from "@/lib/auth/email-verification";

export default async function WriteLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuthSession();

  if (!isWriterSession(session)) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/write")}`);
  }

  const locked = isVerificationGraceExpired(session.user);

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background text-foreground">
      {locked ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Email chưa xác thực quá 1 ngày — không thể tạo hoặc sửa bài. Xác thực email để tiếp tục.
        </div>
      ) : null}
      {children}
    </div>
  );
}
