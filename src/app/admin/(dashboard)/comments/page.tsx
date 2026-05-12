import { MessageSquare } from "lucide-react";

import { CommentModerationPanel, type AdminCommentView } from "@/components/admin/comment-moderation-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { commentService } from "@/services";

export default async function AdminCommentsPage() {
  const comments = await commentService.listCommentsForAdmin();
  const commentViews: AdminCommentView[] = comments.items.map((comment) => ({
    id: comment.id,
    content: comment.content,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author,
    post: comment.post,
  }));

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <Badge className="w-fit" variant="secondary">
            <MessageSquare className="size-3.5 opacity-80" />
            Moderation
          </Badge>
          <CardTitle className="pt-2 text-2xl sm:text-3xl">Comments</CardTitle>
          <CardDescription className="max-w-2xl text-pretty leading-relaxed">
            Quản lý bình luận của độc giả trước khi hiển thị công khai trên bài viết.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {Object.entries(comments.statusCounts).map(([status, count]) => (
          <Card key={status} className="gap-0 py-0 shadow-sm">
            <CardHeader className="space-y-2 px-6 pt-6 pb-5">
              <CardDescription className="text-xs font-medium tracking-wider uppercase">
                {status}
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums">{count}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <CommentModerationPanel initialComments={commentViews} />
    </div>
  );
}
