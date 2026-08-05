"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { FilePenLine, LogOut, UserRound } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { UserRole } from "@/entities/user.entity";
import { cn } from "@/lib/utils";

export type PublicHeaderUser = {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: "ADMIN" | "READER" | "WRITER";
};

type PublicUserMenuProps = {
  user: PublicHeaderUser | null;
};

function getInitials(user: PublicHeaderUser) {
  const name = user.name?.trim();

  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase();
  }

  return user.email.slice(0, 2).toUpperCase();
}

export function PublicUserMenu({ user }: PublicUserMenuProps) {
  const { data: clientSession } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sessionRole = clientSession?.user?.role;
  const canWrite = (sessionRole ?? user?.role) === UserRole.WRITER;
  const displayUser = user
    ? {
      ...user,
      name: clientSession?.user?.name ?? user.name,
      avatarUrl: clientSession?.user?.avatarUrl ?? user.avatarUrl,
    }
    : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!displayUser) {
    return (
      <Link
        className={cn(
          buttonVariants({ size: "sm" }),
          "rounded-full bg-primary px-4 text-primary-foreground hover:bg-primary/90"
        )}
        href="/login"
      >
        Đăng nhập
      </Link>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Tài khoản"
        className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-bold text-primary transition hover:bg-primary/10"
        onClick={() => {
          setOpen((current) => !current);
        }}
        type="button"
      >
        {displayUser.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="size-full rounded-full object-cover" src={displayUser.avatarUrl} />
        ) : (
          getInitials(displayUser)
        )}
      </button>

      {open ? (
        <div
          className="absolute top-full right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-popover p-2 shadow-lg"
          role="menu"
        >
          <div className="border-b border-border px-2.5 py-2">
            <p className="truncate text-sm font-medium text-foreground">
              {displayUser.name?.trim() || "Độc giả"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{displayUser.email}</p>
          </div>
          <Link
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "mt-1 w-full justify-start"
            )}
            href="/account"
            onClick={() => {
              setOpen(false);
            }}
            role="menuitem"
          >
            <UserRound className="size-3.5" />
            Chỉnh sửa tài khoản
          </Link>
          {canWrite ? (
            <Link
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "w-full justify-start"
              )}
              href="/write"
              onClick={() => {
                setOpen(false);
              }}
              role="menuitem"
            >
              <FilePenLine className="size-3.5" />
              Viết bài
            </Link>
          ) : null}
          <Button
            className="w-full justify-start"
            onClick={() => {
              void signOut({ callbackUrl: "/" });
            }}
            role="menuitem"
            size="sm"
            type="button"
            variant="ghost"
          >
            <LogOut className="size-3.5" />
            Đăng xuất
          </Button>
        </div>
      ) : null}
    </div>
  );
}
