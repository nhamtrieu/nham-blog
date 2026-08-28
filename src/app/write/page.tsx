import Link from "next/link";
import { FilePenLine, PlusCircle } from "lucide-react";

import { DeletePostButton } from "@/components/admin/delete-post-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServerAuthSession } from "@/auth";
import { PostStatus } from "@/entities/post.entity";
import { isWriterSession } from "@/lib/auth/authorization";
import { postService } from "@/services";

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export default async function WritePostsPage() {
  const session = await getServerAuthSession();

  if (!isWriterSession(session)) {
    return null;
  }

  const posts = await postService.listPosts({ authorId: session.user.id });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Card className="gap-0 py-0 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-border px-6 pt-6 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit" variant="secondary">
              <FilePenLine className="size-3.5 opacity-80" />
              Writer
            </Badge>
            <CardTitle className="text-2xl sm:text-3xl">Bài viết của tôi</CardTitle>
            <CardDescription>
              Lưu draft tại đây. Admin sẽ publish khi bài sẵn sàng.
            </CardDescription>
          </div>
          <Button nativeButton={false} render={<Link href="/write/new" />}>
            <PlusCircle className="size-4" />
            Tạo bài mới
          </Button>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {posts.items.length === 0 ? (
            <p className="px-6 py-10 text-sm text-muted-foreground">
              Chưa có bài nào. Bắt đầu bằng cách tạo draft mới.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.items.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">
                      <Link className="hover:text-primary" href={`/write/${post.id}`}>
                        {post.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          post.status === PostStatus.PUBLISHED
                            ? "default"
                            : post.status === PostStatus.SCHEDULED
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {post.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(post.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          nativeButton={false}
                          render={<Link href={`/write/${post.id}`} />}
                          size="sm"
                          variant="outline"
                        >
                          Sửa
                        </Button>
                        <DeletePostButton
                          deleteUrl={`/api/write/posts/${post.id}`}
                          postId={post.id}
                          postTitle={post.title}
                          redirectTo="/write"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
