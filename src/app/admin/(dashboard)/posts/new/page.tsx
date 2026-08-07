import { PenSquare, PlusCircle } from "lucide-react";

import { PostEditorForm } from "@/components/admin/post-editor-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { tagService } from "@/services";

export default async function AdminPostCreatePage() {
  const availableTags = await tagService.listTags();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-3">
            <Badge className="gap-1.5 border-primary/25 bg-primary/15 text-primary-foreground" variant="outline">
              <PlusCircle className="size-3.5" />
              Post Creation
            </Badge>
            <CardTitle className="text-3xl sm:text-4xl">Tạo bài viết mới</CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Đây là màn editor đầu tiên cho posts. Sau khi tạo xong, bạn sẽ được đưa thằng vào màn
              hình chỉnh sửa để tiếp tục hoàn thiện bài viết.
            </CardDescription>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-primary">
            <PenSquare className="size-5" />
          </div>
        </CardHeader>
      </Card>

      <PostEditorForm availableTags={availableTags} mode="create" />
    </div>
  );
}
