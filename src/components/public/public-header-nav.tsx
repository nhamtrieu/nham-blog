"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { PublicNotificationBell } from "@/components/public/public-notification-bell";
import { PublicSearchButton } from "@/components/public/public-search-button";
import { PublicThemeToggle } from "@/components/public/public-theme-toggle";
import {
  PublicUserMenu,
  type PublicHeaderUser,
} from "@/components/public/public-user-menu";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Trang chủ" },
  { href: "/blog", label: "Bài viết" },
] as const;

type PublicHeaderNavProps = {
  siteName: string;
  user: PublicHeaderUser | null;
};

export function PublicHeaderNav({ siteName, user }: PublicHeaderNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-primary"
          href="/"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="size-8 rounded-md"
            height={32}
            src="/logo.png"
            width={32}
          />
          <span className="hidden sm:inline">{siteName}</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <nav className="mr-1 flex items-center gap-1 md:hidden" aria-label="Điều hướng nhanh">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <PublicSearchButton initialQuery={searchQuery} />
          <PublicThemeToggle />
          {user ? <PublicNotificationBell /> : null}
          <PublicUserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
