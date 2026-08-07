"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bookmark,
  Heart,
  LoaderCircle,
  Link2,
} from "lucide-react";

import { cn } from "@/lib/utils";

type EngagementState = {
  likeCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
};

type PostEngagementBarProps = {
  slug: string;
  url: string;
  title: string;
  initialEngagement: EngagementState;
  isAuthenticated: boolean;
  loginHref: string;
  orientation?: "vertical" | "horizontal";
  className?: string;
};

function shareHref(kind: "twitter" | "facebook" | "linkedin", url: string, title: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  if (kind === "twitter") {
    return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  }

  if (kind === "facebook") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }

  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
}

function BrandGlyph({ label }: { label: string }) {
  return <span className="text-[11px] font-semibold leading-none">{label}</span>;
}

export function PostEngagementBar({
  slug,
  url,
  title,
  initialEngagement,
  isAuthenticated,
  loginHref,
  orientation = "vertical",
  className,
}: PostEngagementBarProps) {
  const [engagement, setEngagement] = useState(initialEngagement);
  const [busyAction, setBusyAction] = useState<"like" | "save" | "copy" | null>(null);
  const [copied, setCopied] = useState(false);

  async function mutateEngagement(
    action: "like" | "save",
    method: "POST" | "DELETE"
  ) {
    if (!isAuthenticated) {
      window.location.href = loginHref;
      return;
    }

    if (busyAction) {
      return;
    }

    setBusyAction(action);

    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(slug)}/${action}`, {
        method,
      });

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as EngagementState;
      setEngagement(body);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCopyLink() {
    if (busyAction) {
      return;
    }

    setBusyAction("copy");

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      // ignore clipboard failures
    } finally {
      setBusyAction(null);
    }
  }

  const iconButtonClass =
    "inline-flex size-10 items-center justify-center rounded-full text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-sm",
        orientation === "horizontal" ? "flex-row flex-wrap" : "flex-col",
        className
      )}
    >
      <button
        aria-label={engagement.likedByMe ? "Bỏ thích bài viết" : "Thích bài viết"}
        aria-pressed={engagement.likedByMe}
        className={cn(
          iconButtonClass,
          engagement.likedByMe && "text-destructive hover:bg-destructive/10"
        )}
        disabled={busyAction === "like"}
        onClick={() => {
          void mutateEngagement("like", engagement.likedByMe ? "DELETE" : "POST");
        }}
        type="button"
      >
        {busyAction === "like" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Heart className={cn("size-4", engagement.likedByMe && "fill-current")} />
        )}
      </button>

      <span
        className={cn(
          "min-w-6 text-center text-xs tabular-nums text-muted-foreground",
          orientation === "vertical" && "pb-1"
        )}
      >
        {engagement.likeCount}
      </span>

      {isAuthenticated ? (
        <button
          aria-label={engagement.savedByMe ? "Bỏ lưu bài viết" : "Lưu bài viết"}
          aria-pressed={engagement.savedByMe}
          className={cn(
            iconButtonClass,
            engagement.savedByMe && "text-primary hover:bg-primary/10"
          )}
          disabled={busyAction === "save"}
          onClick={() => {
            void mutateEngagement("save", engagement.savedByMe ? "DELETE" : "POST");
          }}
          type="button"
        >
          {busyAction === "save" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Bookmark className={cn("size-4", engagement.savedByMe && "fill-current")} />
          )}
        </button>
      ) : (
        <Link aria-label="Đăng nhập để lưu bài viết" className={iconButtonClass} href={loginHref}>
          <Bookmark className="size-4" />
        </Link>
      )}

      <a
        aria-label="Chia sẻ Facebook"
        className={iconButtonClass}
        href={shareHref("facebook", url, title)}
        rel="noopener noreferrer"
        target="_blank"
      >
        <BrandGlyph label="f" />
      </a>
      <a
        aria-label="Chia sẻ Twitter"
        className={iconButtonClass}
        href={shareHref("twitter", url, title)}
        rel="noopener noreferrer"
        target="_blank"
      >
        <BrandGlyph label="X" />
      </a>
      <a
        aria-label="Chia sẻ LinkedIn"
        className={iconButtonClass}
        href={shareHref("linkedin", url, title)}
        rel="noopener noreferrer"
        target="_blank"
      >
        <BrandGlyph label="in" />
      </a>
      <button
        aria-label={copied ? "Đã sao chép link" : "Sao chép link"}
        className={iconButtonClass}
        disabled={busyAction === "copy"}
        onClick={() => {
          void handleCopyLink();
        }}
        type="button"
      >
        {busyAction === "copy" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Link2 className={cn("size-4", copied && "text-primary")} />
        )}
      </button>
    </div>
  );
}
