"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewsletterIssueStatus } from "@/entities/newsletter-issue.entity";

type IssueView = {
  id: string;
  subject: string;
  status: NewsletterIssueStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  finishedAt: string | null;
  post: { id: string; title: string; slug: string } | null;
};

type NewsletterIssuesPanelProps = {
  initialItems: IssueView[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NewsletterIssuesPanel({ initialItems }: NewsletterIssuesPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [testEmails, setTestEmails] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleTestSend(issueId: string) {
    const email = testEmails[issueId]?.trim();

    if (!email) {
      setMessage("Nhập email để gửi thử.");
      return;
    }

    setBusyKey(`test:${issueId}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/newsletter/issues/${issueId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setMessage(body?.message ?? "Gửi thử thất bại.");
        return;
      }

      setMessage(`Đã gửi thử tới ${email}.`);
    } catch {
      setMessage("Gửi thử thất bại.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRetry(issueId: string) {
    setBusyKey(`retry:${issueId}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/newsletter/issues/${issueId}/retry-failed`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as {
        requeued?: number;
        message?: string;
      } | null;

      if (!response.ok) {
        setMessage(body?.message ?? "Retry thất bại.");
        return;
      }

      setMessage(`Đã requeue ${body?.requeued ?? 0} delivery FAILED.`);
      setItems((current) =>
        current.map((item) =>
          item.id === issueId
            ? {
                ...item,
                status: NewsletterIssueStatus.QUEUED,
                failedCount: 0,
              }
            : item
        )
      );
    } catch {
      setMessage("Retry thất bại.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Card className="gap-0 py-0 shadow-sm">
      {message ? (
        <CardContent className="border-b border-border px-6 py-3 text-sm text-muted-foreground">
          {message}
        </CardContent>
      ) : null}
      <CardContent className="px-0 py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent / Fail / Total</TableHead>
              <TableHead>Tạo lúc</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  Chưa có issue. Publish một bài để tạo đợt gửi đầu tiên.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{item.subject}</p>
                      {item.post ? (
                        <Link
                          className="text-xs text-primary underline-offset-4 hover:underline"
                          href={`/blog/${item.post.slug}`}
                        >
                          /blog/{item.post.slug}
                        </Link>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.status}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {item.sentCount} / {item.failedCount} / {item.totalRecipients}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex min-w-56 flex-col gap-2">
                      <div className="flex gap-2">
                        <Input
                          className="h-8"
                          onChange={(event) => {
                            setTestEmails((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }));
                          }}
                          placeholder="test@email"
                          type="email"
                          value={testEmails[item.id] ?? ""}
                        />
                        <Button
                          disabled={busyKey === `test:${item.id}`}
                          onClick={() => {
                            void handleTestSend(item.id);
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Test
                        </Button>
                      </div>
                      {item.failedCount > 0 ? (
                        <Button
                          disabled={busyKey === `retry:${item.id}`}
                          onClick={() => {
                            void handleRetry(item.id);
                          }}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          Retry failed
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
