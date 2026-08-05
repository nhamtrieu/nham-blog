"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type PublicSiteShellProps = {
  header: ReactNode;
  children: ReactNode;
};

export function PublicSiteShell({ header, children }: PublicSiteShellProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return children;
  }

  return (
    <>
      {header}
      {children}
    </>
  );
}
