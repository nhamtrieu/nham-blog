"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, ImageIcon, Mail, MessageSquare, Tags, Users } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const adminNavItems = [
  {
    href: "/admin",
    label: "Dashboard",
    description: "Tổng quan CMS",
    icon: Home,
  },
  {
    href: "/admin/posts",
    label: "Posts",
    description: "Bài viết",
    icon: FileText,
  },
  {
    href: "/admin/tags",
    label: "Tags",
    description: "Phân loại nội dung",
    icon: Tags,
  },
  {
    href: "/admin/media",
    label: "Media",
    description: "Kho ảnh upload",
    icon: ImageIcon,
  },
  {
    href: "/admin/comments",
    label: "Comments",
    description: "Duyệt bình luận",
    icon: MessageSquare,
  },
  {
    href: "/admin/newsletter/subscribers",
    matchPrefix: "/admin/newsletter",
    label: "Newsletter",
    description: "Subscribers & issues",
    icon: Mail,
  },
  {
    href: "/admin/users",
    label: "Users",
    description: "Chỉ định writer",
    icon: Users,
  },
] as const;

function isActivePath(pathname: string, href: string, matchPrefix?: string) {
  const prefix = matchPrefix ?? href;

  if (prefix === "/admin") {
    return pathname === href;
  }

  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Điều hướng</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {adminNavItems.map((item) => {
            const active = isActivePath(
              pathname,
              item.href,
              "matchPrefix" in item ? item.matchPrefix : undefined
            );
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  className="h-auto min-h-11 items-start py-2 items-center"
                  isActive={active}
                  render={<Link href={item.href} />}
                  tooltip={item.label}
                >
                  <Icon className="mt-0.5 shrink-0" />
                  <span className="grid min-w-0 flex-1 text-left leading-snug group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium">{item.label}</span>
                    <span className="truncate text-xs text-sidebar-foreground/65">{item.description}</span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
