"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  isVerificationGraceExpired,
  needsVerificationBanner,
  type EmailVerificationSessionUser,
} from "@/lib/auth/email-verification";
import { cn } from "@/lib/utils";

type BannerUser = EmailVerificationSessionUser & {
  email?: string | null;
};

type EmailVerificationBannerProps = {
  initialUser?: BannerUser | null;
};

export function EmailVerificationBanner({ initialUser = null }: EmailVerificationBannerProps) {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Stay hidden after ?verified=1 until client session catches up (query is cleared quickly).
  const [dismissedAfterVerify, setDismissedAfterVerify] = useState(false);

  useEffect(() => {
    if (searchParams.get("verified") === "1") {
      setDismissedAfterVerify(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (session?.user?.emailVerified) {
      setDismissedAfterVerify(false);
    }
  }, [session?.user?.emailVerified]);

  if (dismissedAfterVerify || searchParams.get("verified") === "1") {
    return null;
  }

  const sessionUser = session?.user;
  const user: BannerUser | null =
    status === "authenticated" && sessionUser
      ? sessionUser
      : status === "loading"
        ? initialUser
        : sessionUser ?? initialUser;

  if (!user || !needsVerificationBanner(user)) {
    return null;
  }

  const graceExpired = isVerificationGraceExpired(user);

  async function handleResend() {
    if (isResending) {
      return;
    }

    setIsResending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/readers/resend-verification", {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        warning?: string;
        queued?: boolean;
      } | null;

      if (!response.ok) {
        setMessage(body?.message ?? "Không gửi lại được email. Thử lại sau.");
        return;
      }

      if (body?.queued === false) {
        setMessage(body.warning ?? "Không xếp hàng gửi email được. Thử lại sau.");
        return;
      }

      setMessage("Đã gửi lại email xác thực. Kiểm tra hộp thư (hiệu lực 1 ngày).");
    } catch {
      setMessage("Không gửi lại được email. Thử lại sau.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div
      className={cn(
        "border-b px-4 py-3 text-sm",
        graceExpired
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-amber-500/30 bg-amber-500/10 text-foreground"
      )}
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {graceExpired
            ? "Email chưa xác thực quá 1 ngày — comment, thích, lưu và viết bài đã bị khóa. Hãy xác thực email để tiếp tục."
            : "Vui lòng xác thực email để bảo vệ tài khoản. Link trong email có hiệu lực 1 ngày."}
          {user.email ? (
            <>
              {" "}
              (<span className="font-medium">{user.email}</span>)
            </>
          ) : null}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {message ? <span className="text-xs opacity-90">{message}</span> : null}
          <button
            type="button"
            className="rounded-md border border-current/20 px-3 py-1.5 text-xs font-medium hover:bg-background/40 disabled:opacity-60"
            disabled={isResending}
            onClick={() => {
              void handleResend();
            }}
          >
            {isResending ? "Đang gửi…" : "Gửi lại email"}
          </button>
        </div>
      </div>
    </div>
  );
}
