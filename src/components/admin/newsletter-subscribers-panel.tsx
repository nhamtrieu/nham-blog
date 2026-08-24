"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
import { NewsletterSubscriberStatus } from "@/entities/newsletter-subscriber.entity";

type SubscriberView = {
  id: string;
  email: string;
  status: NewsletterSubscriberStatus;
  source: string | null;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

type NewsletterSubscribersPanelProps = {
  initialItems: SubscriberView[];
  initialStatus: string;
  initialSearch: string;
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

function statusBadgeVariant(status: NewsletterSubscriberStatus) {
  if (status === NewsletterSubscriberStatus.ACTIVE) {
    return "default" as const;
  }

  if (status === NewsletterSubscriberStatus.PENDING) {
    return "secondary" as const;
  }

  return "outline" as const;
}

export function NewsletterSubscribersPanel({
  initialItems,
  initialStatus,
  initialSearch,
}: NewsletterSubscribersPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function applyFilters(nextStatus: string, nextSearch: string) {
    const params = new URLSearchParams();

    if (nextStatus) {
      params.set("status", nextStatus);
    }

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/admin/newsletter/subscribers?${query}` : "/admin/newsletter/subscribers");
    });
  }

  async function handleUnsubscribe(subscriberId: string) {
    setBusyId(subscriberId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/newsletter/subscribers/${subscriberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setMessage("Không hủy được subscriber.");
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === subscriberId
            ? {
                ...item,
                status: NewsletterSubscriberStatus.UNSUBSCRIBED,
                unsubscribedAt: new Date().toISOString(),
              }
            : item
        )
      );
    } catch {
      setMessage("Không hủy được subscriber.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="gap-0 py-0 shadow-sm">
      <CardContent className="space-y-4 px-6 py-5">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters(status, search);
          }}
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="newsletter-search">
              Email
            </label>
            <Input
              id="newsletter-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm email…"
              value={search}
            />
          </div>
          <div className="space-y-1.5 sm:w-48">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="newsletter-status">
              Status
            </label>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              id="newsletter-status"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="">Tất cả</option>
              {Object.values(NewsletterSubscriberStatus).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <Button disabled={isPending} type="submit">
            Lọc
          </Button>
        </form>

        {message ? <p className="text-sm text-destructive">{message}</p> : null}
      </CardContent>

      <CardContent className="px-0 py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Tạo lúc</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  Chưa có subscriber.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.email}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.source ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {item.status !== NewsletterSubscriberStatus.UNSUBSCRIBED ? (
                      <Button
                        disabled={busyId === item.id}
                        onClick={() => {
                          void handleUnsubscribe(item.id);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Unsubscribe
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.unsubscribedAt)}
                      </span>
                    )}
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
