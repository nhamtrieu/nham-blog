"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { launchVerificationFireworks } from "@/lib/ui/verification-fireworks";

/** Watches ?verified=1 — fireworks + toast + session refresh (works even when banner is hidden). */
export function EmailVerifiedCelebration() {
  const { status, update } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const didRun = useRef(false);

  useEffect(() => {
    if (searchParams.get("verified") !== "1") {
      return;
    }

    if (didRun.current) {
      return;
    }
    didRun.current = true;

    launchVerificationFireworks();
    toast.success("Email đã được xác thực. Chúc mừng!");

    const finish = () => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("verified");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
      router.refresh();
    };

    if (status === "authenticated") {
      void update({}).finally(finish);
      return;
    }

    finish();
  }, [pathname, router, searchParams, status, update]);

  return null;
}
