"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { PublicStatusPage, actionLinkClass } from "@/components/public/public-status-page";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PublicStatusPage
      description="Hệ thống gặp sự cố tạm thời. Vui lòng thử lại. Nếu lỗi lặp lại, hay thử lại sau hoặc liên hệ quản trị viên."
      title="Đã có lỗi xảy ra"
      actions={
        <>
          <Button onClick={() => reset()} type="button" variant="outline">
            Thử lại
          </Button>
          <Link className={actionLinkClass} href="/">
            Về trang chủ
          </Link>
        </>
      }
    />
  );
}
