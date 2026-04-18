import Link from "next/link";
import { FilePenLine, FileText, PlusCircle } from "lucide-react";

import { AdminPostsFilterForm } from "@/components/admin/admin-posts-filter-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PostStatus } from "@/entities/post.entity";
import { postService } from "@/services";

type AdminPostsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

const statusOptions = [
  { label: "Tat ca trang thai", value: "ALL" },
  { label: "Draft", value: PostStatus.DRAFT },
  { label: "Published", value: PostStatus.PUBLISHED },
] as const;

function parseStatusFilter(value: string | undefined) {
  if (value === PostStatus.DRAFT || value === PostStatus.PUBLISHED) {
    return value;
  }

  return null;
}

function formatDate(date: Date | null) {
  if (!date) {
    return "Chua publish";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function buildResetHref() {
  return "/admin/posts";
}

export default async function AdminPostsPage({ searchParams }: AdminPostsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const search = resolvedSearchParams.q?.trim() ?? "";
  const status = parseStatusFilter(resolvedSearchParams.status);
  const posts = await postService.listPosts({
    search: search || undefined,
    status: status ?? undefined,
  });
  const hasActiveFilters = search.length > 0 || status !== null;

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-8">
      <Card className="gap-0 py-0 shadow-md">
        <CardHeader className="flex flex-col gap-5 border-b border-border px-6 pt-6 pb-6">
          <Badge className="w-fit" variant="secondary">
            <FileText className="size-3.5 opacity-80" />
            Posts Workspace
          </Badge>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <CardTitle className="text-2xl sm:text-3xl">Bai viet</CardTitle>
            <Button
              className="w-full shrink-0 sm:w-auto"
              nativeButton={false}
              render={<Link href="/admin/posts/new" />}
              size="default"
            >
              <PlusCircle className="size-4" />
              Tao bai viet
            </Button>
          </div>
          <CardDescription className="max-w-3xl text-pretty leading-relaxed">
            Danh sach bai viet voi filter theo status va tim theo tieu de. Giao dien chuan hoa shadcn/ui (Card, Table,
            Badge, Button).
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        <Card className="gap-0 py-0 shadow-sm">
          <CardHeader className="space-y-2 px-6 pt-6 pb-3">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              Tổng bài viết
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{posts.totalCount}</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">Tổng số bài trong hệ thống admin.</p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0 shadow-sm">
          <CardHeader className="space-y-2 px-6 pt-6 pb-3">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Draft</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{posts.statusCounts.draft}</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">Bài đang trong quá trình biên tập.</p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0 shadow-sm">
          <CardHeader className="space-y-2 px-6 pt-6 pb-3">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Published</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{posts.statusCounts.published}</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">Bài đã publish lên trang public site.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader className="space-y-1.5 pb-2">
          <CardTitle className="text-base">Bo loc</CardTitle>
          <CardDescription>Tìm kiếm theo title và lọc theo trạng thái.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <AdminPostsFilterForm
            defaultSearch={posts.appliedFilters.search}
            defaultStatus={posts.appliedFilters.status ?? "ALL"}
            hasActiveFilters={hasActiveFilters}
            resetHref={buildResetHref()}
            statusOptions={statusOptions}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-md">
        <CardHeader className="border-b border-border py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Bang bai viet</CardTitle>
              <CardDescription className="mt-1">
                Tìm thấy {posts.filteredCount} kết quả
                {hasActiveFilters ? " theo bộ lọc hiện tại." : "."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {posts.appliedFilters.status ? (
                <Badge variant="secondary">Status: {posts.appliedFilters.status}</Badge>
              ) : null}
              {posts.appliedFilters.search ? (
                <Badge variant="outline">Search: {posts.appliedFilters.search}</Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-8 pt-0">
          {posts.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                <FileText className="size-5" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold">Chưa có bài viết phù hợp</p>
                <p className="max-w-xl text-sm text-muted-foreground leading-relaxed">
                  {hasActiveFilters
                    ? "Thu đổi bộ lọc hoặc từ khóa tìm kiếm."
                    : "Tạo bài viết đầu tiên để bắt đầu."}
                </p>
              </div>
              {!hasActiveFilters ? (
                <Button nativeButton={false} render={<Link href="/admin/posts/new" />}>
                  <PlusCircle className="size-4" />
                  Tạo bài viết đầu tiên
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <Separator className="mb-0" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Đọc</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead>Publish</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.items.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="min-w-[18rem] max-w-md align-top">
                        <div className="space-y-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-3 sm:gap-y-2">
                            <Link
                              className="min-w-0 font-semibold text-foreground underline-offset-4 hover:underline"
                              href={`/admin/posts/${post.id}`}
                            >
                              {post.title}
                            </Link>
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <Badge
                                className="max-w-48 truncate border-transparent bg-muted px-2.5 py-1 text-muted-foreground"
                                variant="secondary"
                              >
                                {post.slug}
                              </Badge>
                              <Button
                                nativeButton={false}
                                render={<Link href={`/admin/posts/${post.id}`} />}
                                size="sm"
                                variant="outline"
                              >
                                <FilePenLine className="size-3.5" />
                                Edit
                              </Button>
                            </div>
                          </div>
                          <p className="max-w-xl pt-1 text-sm text-muted-foreground leading-relaxed sm:pt-2">
                            {post.excerpt ?? "Chua co excerpt."}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge
                          className={
                            post.status === PostStatus.PUBLISHED
                              ? "border-emerald-500/25 bg-emerald-500/15 px-2.5 py-1 text-emerald-100"
                              : "border-amber-500/25 bg-amber-500/15 px-2.5 py-1 text-amber-100"
                          }
                          variant="outline"
                        >
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        {post.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {post.tags.map((tag) => (
                              <Badge key={tag.id} className="px-2.5 py-1" variant="secondary">
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Chua gan tag</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground">{post.readingTime} phut</TableCell>
                      <TableCell className="align-top text-muted-foreground">{formatDate(post.updatedAt)}</TableCell>
                      <TableCell className="align-top text-muted-foreground">{formatDate(post.publishedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>

        {posts.items.length > 0 ? (
          <CardFooter className="border-t border-border px-6 py-5 text-sm text-muted-foreground">
            Hien thi {posts.items.length} / {posts.filteredCount} ket qua trong trang nay.
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
