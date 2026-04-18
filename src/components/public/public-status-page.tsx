import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PublicStatusPageProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
};

export const actionLinkClass = cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full");

export function PublicStatusPage({ title, description, actions, className }: PublicStatusPageProps) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-16 sm:px-6",
        className
      )}
    >
      <Card className="text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-wrap justify-center gap-3">
          {actions ?? (
            <Link className={actionLinkClass} href="/">
              Quay lại trang chủ
            </Link>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
