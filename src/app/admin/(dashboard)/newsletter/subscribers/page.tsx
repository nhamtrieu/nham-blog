import Link from "next/link";
import { Mail } from "lucide-react";

import { NewsletterSubscribersPanel } from "@/components/admin/newsletter-subscribers-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewsletterSubscriberStatus } from "@/entities/newsletter-subscriber.entity";
import { newsletterService } from "@/services";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
};

export default async function AdminNewsletterSubscribersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status =
    params.status &&
    Object.values(NewsletterSubscriberStatus).includes(
      params.status as NewsletterSubscriberStatus
    )
      ? (params.status as NewsletterSubscriberStatus)
      : undefined;
  const search = params.search?.trim() || undefined;
  const result = await newsletterService.listSubscribers({ status, search });

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-8">
      <Card className="gap-0 py-0 shadow-md">
        <CardHeader className="flex flex-col gap-5 border-b border-border px-6 pt-6 pb-6">
          <Badge className="w-fit" variant="secondary">
            <Mail className="size-3.5 opacity-80" />
            Newsletter
          </Badge>
          <CardTitle className="text-2xl sm:text-3xl">Subscribers</CardTitle>
          <CardDescription className="max-w-3xl text-pretty leading-relaxed">
            Danh sách đăng ký nhận bài mới. Double opt-in — chỉ <strong>ACTIVE</strong> nhận email khi
            publish.
          </CardDescription>
          <div>
            <Button nativeButton={false} render={<Link href="/admin/newsletter/issues" />} size="sm" variant="outline">
              Xem lịch sử gửi
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-4 text-sm text-muted-foreground">
          {result.statusCounts.active} active · {result.statusCounts.pending} pending ·{" "}
          {result.statusCounts.unsubscribed} unsubscribed
        </CardContent>
      </Card>

      <NewsletterSubscribersPanel
        initialItems={result.items.map((item) => ({
          ...item,
          confirmedAt: item.confirmedAt?.toISOString() ?? null,
          unsubscribedAt: item.unsubscribedAt?.toISOString() ?? null,
          createdAt: item.createdAt.toISOString(),
        }))}
        initialSearch={search ?? ""}
        initialStatus={status ?? ""}
      />
    </div>
  );
}
