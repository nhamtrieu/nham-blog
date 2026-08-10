"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { EmailVerificationBanner } from "@/components/public/email-verification-banner";
import { EmailVerifiedCelebration } from "@/components/public/email-verified-celebration";
import type { EmailVerificationSessionUser } from "@/lib/auth/email-verification";

type BannerUser = EmailVerificationSessionUser & {
  email?: string | null;
};

type PublicSiteShellProps = {
  header: ReactNode;
  children: ReactNode;
  verificationUser?: BannerUser | null;
};

export function PublicSiteShell({
  header,
  children,
  verificationUser = null,
}: PublicSiteShellProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return children;
  }

  return (
    <>
      <Suspense fallback={null}>
        <EmailVerifiedCelebration />
        <EmailVerificationBanner initialUser={verificationUser} />
      </Suspense>
      {header}
      {children}
    </>
  );
}
