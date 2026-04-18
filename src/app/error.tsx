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
      description="He thong gap su co tam thoi. Vui long thu lai. Neu loi lap lai, hay thu lai sau hoac lien he quan tri vien."
      title="Da co loi xay ra"
      actions={
        <>
          <Button onClick={() => reset()} type="button" variant="outline">
            Thu lai
          </Button>
          <Link className={actionLinkClass} href="/">
            Ve trang chu
          </Link>
        </>
      }
    />
  );
}
