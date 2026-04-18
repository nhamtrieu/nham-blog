import { notFound } from "next/navigation";
import { Clock3, FilePenLine } from "lucide-react";

import { PostEditorForm } from "@/components/admin/post-editor-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICE_ERROR_CODES, isServiceError, postService, tagService } from "@/services";

type AdminPostEditPageProps = {
  params: Promise<{
    postId: string;
  }>;
};

export default async function AdminPostEditPage({ params }: AdminPostEditPageProps) {
  const { postId } = await params;

  try {
    const [post, availableTags] = await Promise.all([
      postService.getPost(postId),
      tagService.listTags(),
    ]);

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <Badge className="gap-1.5 border-primary/25 bg-primary/15 text-primary-foreground" variant="outline">
                  <FilePenLine className="size-3.5" />
                  Post Editing
                </Badge>
                <CardTitle className="text-3xl sm:text-4xl">{post.title}</CardTitle>
                <CardDescription className="max-w-2xl text-base">
                  Bạn đang chỉnh sửa bài viết có slug `{post.slug}`. Mọi thay đổi sẽ đi qua post APIs
                  và business rules đã hoàn thành ở milepost trước.
                </CardDescription>
              </div>
              <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:min-w-[15rem] lg:grid-cols-1">
                <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Trạng thái</p>
                  <p className="text-lg font-semibold text-foreground">{post.status}</p>
                </div>
                <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Thời gian đọc</p>
                  <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Clock3 className="size-4 text-primary" />
                    {post.readingTime} phút đọc
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <PostEditorForm
          availableTags={availableTags}
          initialData={{
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            contentMdx: post.contentMdx,
            coverImageUrl: post.coverImageUrl,
            status: post.status,
            seoTitle: post.seoTitle,
            seoDescription: post.seoDescription,
            tagIds: post.tagIds,
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            publishedAt: post.publishedAt?.toISOString() ?? null,
          }}
          mode="edit"
        />
      </div>
    );
  } catch (error) {
    if (isServiceError(error) && error.code === SERVICE_ERROR_CODES.NOT_FOUND) {
      notFound();
    }

    throw error;
  }
}
