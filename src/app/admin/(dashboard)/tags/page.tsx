import { Tags } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TagManagementPanel } from "@/components/admin/tag-management-panel";
import { tagService } from "@/services";

export default async function AdminTagsPage() {
  const tags = await tagService.listTags();

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <Badge className="w-fit" variant="secondary">
            <Tags className="size-3.5 opacity-80" />
            Quản lý tags
          </Badge>
          <CardTitle className="pt-2 text-2xl sm:text-3xl">Tags</CardTitle>
          <CardDescription>
            Quản lý tags theo luồng CRUD trực tiếp trong admin. Kéo thả để đổi thứ tự hiển thị trên trang user.
          </CardDescription>
        </CardHeader>
      </Card>

      <TagManagementPanel initialTags={tags} />
    </div>
  );
}
