import { PenSquare, PlusCircle } from "lucide-react";

import { PostEditorForm } from "@/components/admin/post-editor-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { tagService } from "@/services";

export default async function WritePostCreatePage() {
  const availableTags = await tagService.listTags();

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-3">
            <Badge className="gap-1.5" variant="outline">
              <PlusCircle className="size-3.5" />
              Draft mới
            </Badge>
            <CardTitle className="text-3xl sm:text-4xl">Tạo bài viết</CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Bài sẽ được lưu ở trạng thái draft. Admin sẽ publish khi sẵn sàng.
            </CardDescription>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-primary">
            <PenSquare className="size-5" />
          </div>
        </CardHeader>
      </Card>

      <PostEditorForm
        availableTags={availableTags}
        mediaSavePath="/api/write/media"
        mediaSignPath="/api/write/media/sign"
        mode="create"
        postsApiBasePath="/api/write/posts"
        postsListHref="/write"
        variant="writer"
      />
    </main>
  );
}
