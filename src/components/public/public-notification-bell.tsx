"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  readAt: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
  };
  post: {
    id: string;
    slug: string;
    title: string;
  };
  commentId: string | null;
  parentCommentId: string | null;
};

type NotificationListResponse = {
  items: NotificationItem[];
};

type UnreadCountResponse = {
  count: number;
};

type SseNotificationPayload = {
  id: string;
  type: string;
  actorName: string | null;
  postSlug: string;
  commentId: string | null;
  parentCommentId: string | null;
  createdAt: string;
};

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) {
    return "Vừa xong";
  }

  if (minutes < 60) {
    return `${minutes} phút trước`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} giờ trước`;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function notificationMessage(item: Pick<NotificationItem, "type" | "actor" | "post">) {
  const actorName = item.actor.name ?? "Ai đó";
  const postSuffix = item.post.title ? ` trên “${item.post.title}”` : "";

  if (item.type === "POST_LIKE") {
    return (
      <>
        <span className="font-medium">{actorName}</span> đã thích bài viết của bạn
        {postSuffix}.
      </>
    );
  }

  if (item.type === "POST_COMMENT") {
    return (
      <>
        <span className="font-medium">{actorName}</span> đã bình luận về bài viết của bạn
        {postSuffix}.
      </>
    );
  }

  return (
    <>
      <span className="font-medium">{actorName}</span> đã trả lời bình luận của bạn
      {postSuffix}.
    </>
  );
}

function notificationHref(item: Pick<NotificationItem, "type" | "post" | "commentId">) {
  if (item.type === "POST_LIKE" || !item.commentId) {
    return `/blog/${item.post.slug}`;
  }

  return `/blog/${item.post.slug}#comment-${item.commentId}`;
}

export function PublicNotificationBell() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function refreshUnreadCount() {
    try {
      const response = await fetch("/api/notifications/unread-count");

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as UnreadCountResponse;
      setUnreadCount(body.count);
    } catch {
      // ignore transient errors
    }
  }

  async function loadNotifications() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/notifications?limit=20");

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as NotificationListResponse;
      setItems(body.items);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshUnreadCount();

    const pollId = window.setInterval(() => {
      void refreshUnreadCount();
    }, 60000);

    const source = new EventSource("/api/notifications/stream");

    source.addEventListener("notification", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as SseNotificationPayload;
      setUnreadCount((current) => current + 1);
      setItems((current) => {
        if (current.some((item) => item.id === payload.id)) {
          return current;
        }

        const nextItem: NotificationItem = {
          id: payload.id,
          type: payload.type,
          readAt: null,
          createdAt: payload.createdAt,
          actor: {
            id: "",
            name: payload.actorName,
          },
          post: {
            id: "",
            slug: payload.postSlug,
            title: "",
          },
          commentId: payload.commentId,
          parentCommentId: payload.parentCommentId,
        };

        return [nextItem, ...current].slice(0, 20);
      });
    });

    source.onerror = () => {
      // EventSource reconnects automatically; unread poll covers gaps.
    };

    return () => {
      window.clearInterval(pollId);
      source.close();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadNotifications();

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

  async function markOneRead(notification: NotificationItem) {
    if (!notification.readAt) {
      await fetch(`/api/notifications/${notification.id}/read`, { method: "PATCH" });
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    setOpen(false);
  }

  async function markAllRead() {
    if (isMarkingAll || unreadCount === 0) {
      return;
    }

    setIsMarkingAll(true);

    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setItems((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        aria-expanded={open}
        aria-label="Thông báo"
        className="relative size-8 rounded-full"
        onClick={() => {
          setOpen((current) => !current);
        }}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute top-full right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-popover p-2 shadow-lg sm:w-96">
          <div className="flex items-center justify-between gap-2 border-b border-border px-2 pb-2">
            <p className="text-sm font-semibold text-foreground">Thông báo</p>
            <Button
              disabled={isMarkingAll || unreadCount === 0}
              onClick={() => {
                void markAllRead();
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              {isMarkingAll ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <CheckCheck className="size-3.5" />
              )}
              Đọc tất cả
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            {isLoading ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">Đang tải...</p>
            ) : items.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Chưa có thông báo.
              </p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-auto w-full items-start justify-start gap-2 whitespace-normal px-2 py-2 text-left"
                  )}
                  href={notificationHref(item)}
                  onClick={(event) => {
                    void markOneRead(item);

                    if (!item.commentId || item.type === "POST_LIKE") {
                      return;
                    }

                    // Same post page: Next soft-nav won't remount comments — force refetch + scroll.
                    if (pathname === `/blog/${item.post.slug}`) {
                      event.preventDefault();
                      window.dispatchEvent(
                        new CustomEvent("blog:focus-comment", {
                          detail: { commentId: item.commentId },
                        })
                      );
                    }
                  }}
                >
                  <span
                    className={cn(
                      "mt-1 size-2 shrink-0 rounded-full",
                      item.readAt ? "bg-transparent" : "bg-primary"
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-foreground">
                      {notificationMessage(item)}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
