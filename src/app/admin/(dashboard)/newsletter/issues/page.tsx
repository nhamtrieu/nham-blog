import Link from "next/link";
import { Mail } from "lucide-react";

import { NewsletterIssuesPanel } from "@/components/admin/newsletter-issues-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { newsletterService } from "@/services";

export default async function AdminNewsletterIssuesPage() {
  const result = await newsletterService.listIssues();

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-8">
      <Card className="gap-0 py-0 shadow-md">
        <CardHeader className="flex flex-col gap-5 border-b border-border px-6 pt-6 pb-6">
          <Badge className="w-fit" variant="secondary">
            <Mail className="size-3.5 opacity-80" />
            Newsletter
          </Badge>
          <CardTitle className="text-2xl sm:text-3xl">Issues</CardTitle>
          <CardDescription className="max-w-3xl text-pretty leading-relaxed">
            Mỗi bài publish lần đầu tạo tối đa một đợt gửi. Có thể gửi thử và retry các delivery
            FAILED.
          </CardDescription>
          <div>
            <Button
              nativeButton={false}
              render={<Link href="/admin/newsletter/subscribers" />}
              size="sm"
              variant="outline"
            >
              Danh sách subscribers
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-4 text-sm text-muted-foreground">
          {result.items.length} issue(s)
        </CardContent>
      </Card>

      <NewsletterIssuesPanel
        initialItems={result.items.map((item) => ({
          id: item.id,
          subject: item.subject,
          status: item.status,
          totalRecipients: item.totalRecipients,
          sentCount: item.sentCount,
          failedCount: item.failedCount,
          createdAt: item.createdAt.toISOString(),
          finishedAt: item.finishedAt?.toISOString() ?? null,
          post: item.post,
        }))}
      />
    </div>
  );
}
