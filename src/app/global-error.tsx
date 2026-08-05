"use client";

import "./globals.css";

import Link from "next/link";
import { useEffect } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Renders when the root layout fails. Must define its own html/body (Next.js requirement).
 * Copy is generic and does not expose internal error details.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
          <Card className="text-center shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Da co loi xay ra</CardTitle>
              <CardDescription className="text-base">
                He thong gap su co nghiem trong. Vui long tai lai trang. Neu van de tiep tuc, hay thu lai sau.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap justify-center gap-3">
              <button
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={() => reset()}
                type="button"
              >
                Thu lai
              </button>
              <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")} href="/">
                Về trang chủ
              </Link>
            </CardFooter>
          </Card>
        </main>
      </body>
    </html>
  );
}
