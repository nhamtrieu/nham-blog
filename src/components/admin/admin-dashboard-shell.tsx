"use client";

import Link from "next/link";
import { BellDot, Search } from "lucide-react";

import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

type AdminDashboardShellProps = {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
};

export function AdminDashboardShell({ children, userName, userEmail }: AdminDashboardShellProps) {
  return (
    <TooltipProvider delay={0}>
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader className="gap-3 border-b border-sidebar-border p-4">
            <Link
              className="flex items-center gap-2 rounded-md text-sm font-semibold text-sidebar-foreground ring-sidebar-ring outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
              href="/admin"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="text-xs font-bold">N</span>
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">Nham CMS</span>
                <span className="truncate text-xs font-normal text-sidebar-foreground/70">Editorial Console</span>
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <AdminSidebarNav />
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
                {(userName || userEmail || "A").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
                <p className="truncate text-xs text-sidebar-foreground/70">{userEmail}</p>
              </div>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-h-0 bg-background mt-0 relative">
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-card/80 md:px-6">
              <SidebarTrigger className="-ml-1" />
              <Separator className="hidden h-6 md:block" orientation="vertical" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-center md:gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">Admin Surface</p>
                  <p className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">
                    Quản lý Nham Blog
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-1 md:flex-row md:items-center md:justify-end md:gap-3">
                  <div className="relative w-full min-w-0">
                    <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      aria-label="Gợi ý: nhiều trang admin hỗ trợ lọc qua tham số URL. Ô này minh họa vị trí tìm kiếm."
                      className="h-10 w-full border-input bg-background pr-3 pl-9 text-foreground shadow-xs placeholder:text-muted-foreground !min-w-3xs"
                      placeholder="Tìm kiếm & filter theo URL…"
                      type="search"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className="gap-1.5 border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-100"
                      variant="outline"
                    >
                      <BellDot className="size-3.5 shrink-0" />
                      CMS MVP
                    </Badge>
                    <Button nativeButton={false} render={<Link href="/" />} size="sm" variant="outline">
                      Xem trang public
                    </Button>
                  </div>
                </div>
              </div>
            </header>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
