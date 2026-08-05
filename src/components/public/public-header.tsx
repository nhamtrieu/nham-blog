import { Suspense } from "react";

import { getServerAuthSession } from "@/auth";
import { PublicHeaderNav } from "@/components/public/public-header-nav";
import { siteConfig } from "@/config/site";
import { isAuthenticatedSession } from "@/lib/auth/authorization";

export async function PublicHeader() {
  const session = await getServerAuthSession();
  const user = isAuthenticatedSession(session)
    ? {
      name: session.user.name,
      email: session.user.email,
      avatarUrl: session.user.avatarUrl,
      role: session.user.role,
    }
    : null;

  return (
    <Suspense fallback={<div className="h-16 border-b border-border/70" />}>
      <PublicHeaderNav siteName={siteConfig.name} user={user} />
    </Suspense>
  );
}
