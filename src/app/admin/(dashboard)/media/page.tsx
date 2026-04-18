import { ImageIcon, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminMediaPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <Badge className="w-fit" variant="secondary">
            <ImageIcon className="size-3.5 opacity-80" />
            Kho media
          </Badge>
          <CardTitle className="pt-2 text-2xl sm:text-3xl">Media</CardTitle>
          <CardDescription className="max-w-2xl text-pretty leading-relaxed">
            Cloudinary signed upload đã được nối với post editor. Khu media này dùng để theo dõi policy upload và
            metadata lưu trong hệ thống.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0 space-y-2">
            <CardTitle className="text-lg">Upload policy đã được khóa bảo mật</CardTitle>
            <CardDescription className="text-foreground/80 leading-relaxed">
              Client nhận payload ký tự <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/api/admin/media/sign</code>, upload trực tiếp lên Cloudinary, sau đó lưu metadata qua API{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/api/admin/media</code>.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
