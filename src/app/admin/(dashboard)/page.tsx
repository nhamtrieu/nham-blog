import Link from "next/link";
import { ArrowRight, Clock3, FileText, ImageIcon, Tags } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PostStatus } from "@/entities/post.entity";
import { postService } from "@/services";

const overviewCards = [
  {
    label: "Posts API",
    value: "CRUD ready",
    description: "Create, update, delete post và slug unique đã sẵn sàng cho UI.",
    icon: FileText,
  },
  {
    label: "Tags API",
    value: "CRUD ready",
    description: "Quản lý tag đã có conflict handling và relation cleanup rõ ràng.",
    icon: Tags,
  },
  {
    label: "Media Sign",
    value: "Cloudinary",
    description: "Signed upload payload đã sẵn sàng cho uploader.",
    icon: ImageIcon,
  },
] as const;

const quickLinks = [
  {
    href: "/admin/posts",
    title: "Quản lý bài viết",
    description: "Danh sách bài viết, filter và search.",
  },
  {
    href: "/admin/tags",
    title: "Quản lý tags",
    description: "CRUD tags và phân loại nội dung.",
  },
  {
    href: "/admin/media",
    title: "Quản lý media",
    description: "Kho tài nguyên và policy upload.",
  },
] as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default async function AdminDashboardPage() {
  const posts = await postService.listPosts();
  const latestPosts = posts.items.slice(0, 5);

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-md">
        <CardHeader className="flex flex-col gap-4 border-b border-border bg-muted/30 px-6 py-8 sm:px-8 sm:py-10">
          <CardTitle className="text-2xl leading-tight sm:text-3xl">
            Dashboard shell chuẩn shadcn/ui cho Posts, Tags và Media.
          </CardTitle>
          <CardDescription className="max-w-2xl text-base leading-relaxed">
            Sidebar, Card, Button và navigation thông nhất với design tokens (dark).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button nativeButton={false} render={<Link href="/admin/posts" />} size="lg">
                Bắt đầu tạo bài viết
              </Button>
              <Button nativeButton={false} render={<Link href="/admin/media" />} size="lg" variant="outline">
                Khu Media
              </Button>
            </div>

            <Card className="gap-0 py-0 shadow-sm">
              <CardHeader className="gap-3 border-b border-border px-5 pt-6 pb-4 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <CardTitle className="text-lg">Bài viết mới nhất</CardTitle>
                    <CardDescription className="leading-relaxed">
                      Chọn một bài để mở nhanh màn hình chỉnh sửa.
                    </CardDescription>
                  </div>
                  <Button nativeButton={false} render={<Link href="/admin/posts" />} size="sm" variant="outline">
                    Xem tất cả
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-3 sm:px-6">
                {latestPosts.length > 0 ? (
                  <div className="divide-y divide-border">
                    {latestPosts.map((post) => (
                      <Link
                        key={post.id}
                        className="flex items-start justify-between gap-4 py-4 transition-colors hover:text-primary"
                        href={`/admin/posts/${post.id}`}
                      >
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-foreground">{post.title}</p>
                            <Badge
                              className={
                                post.status === PostStatus.PUBLISHED
                                  ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-100"
                                  : "border-amber-500/25 bg-amber-500/15 text-amber-100"
                              }
                              variant="outline"
                            >
                              {post.status}
                            </Badge>
                          </div>
                          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {post.excerpt ?? "Chưa có excerpt cho bài viết này."}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 className="size-3.5" />
                              Cập nhật {formatDate(post.updatedAt)}
                            </span>
                            <span>{post.readingTime} phút đọc</span>
                          </div>
                        </div>
                        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                    Chưa có bài viết nào để hiển thị. Tạo bài viết đầu tiên để dashboard hiện danh sách gần đây.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {overviewCards.map((card) => {
              const Icon = card.icon;

              return (
                <Card key={card.label} className="gap-0 py-0 shadow-sm">
                  <CardHeader className="flex flex-col gap-4 px-5 pt-6 pb-3 sm:px-6 sm:pt-7">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                        {card.label}
                      </span>
                    </div>
                    <CardTitle className="text-base">{card.value}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-6 pt-0 sm:px-6 sm:pb-7">
                    <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {quickLinks.map((item) => (
          <Card key={item.href} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-col px-6 py-7 sm:px-7 sm:py-8">
              <div className="flex items-start justify-between gap-4 w-full">
                <div className="min-w-0 space-y-2">
                  <CardTitle className="text-lg leading-snug">{item.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{item.description}</CardDescription>
                </div>
                <Button
                  aria-label={`Mo ${item.title}`}
                  className="shrink-0"
                  nativeButton={false}
                  render={<Link href={item.href} />}
                  size="icon-sm"
                  variant="outline"
                >
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
