"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, LoaderCircle, MessageSquare, ShieldBan, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CommentStatus } from "@/entities/comment.entity";
import { cn } from "@/lib/utils";

export type AdminCommentView = {
  id: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
  author: {
    email: string;
    name: string | null;
  };
  post: {
    slug: string;
    title: string;
  };
};

type CommentModerationPanelProps = {
  initialComments: AdminCommentView[];
};

type ApiErrorResponse = {
  message?: string;
};

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusBadgeVariant(status: CommentStatus) {
  if (status === CommentStatus.APPROVED) {
    return "default" as const;
  }

  if (status === CommentStatus.PENDING) {
    return "secondary" as const;
  }

  return "destructive" as const;
}

export function CommentModerationPanel({ initialComments }: CommentModerationPanelProps) {
  const [comments, setComments] = useState(initialComments);
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function updateCommentStatus(commentId: string, status: CommentStatus) {
    if (busyCommentId) {
      return;
    }

    setBusyCommentId(commentId);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const responseBody = await parseJsonResponse<AdminCommentView | ApiErrorResponse>(response);

      if (!response.ok) {
        setErrorMessage((responseBody as ApiErrorResponse | null)?.message ?? "Khong the cap nhat comment.");
        return;
      }

      if (!responseBody) {
        setErrorMessage("API da tra ve phan hoi khong hop le.");
        return;
      }

      const updatedComment = responseBody as AdminCommentView;

      setComments((currentComments) =>
        currentComments.map((comment) => (comment.id === commentId ? updatedComment : comment))
      );
      setFeedbackMessage("Da cap nhat trang thai comment.");
    } catch {
      setErrorMessage("Khong the ket noi toi API comments.");
    } finally {
      setBusyCommentId(null);
    }
  }

  async function deleteComment(comment: AdminCommentView) {
    if (busyCommentId) {
      return;
    }

    const shouldDelete = window.confirm("Bạn có chắc muốn xóa bình luận này không?");

    if (!shouldDelete) {
      return;
    }

    setBusyCommentId(comment.id);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/admin/comments/${comment.id}`, {
        method: "DELETE",
      });
      const responseBody = await parseJsonResponse<ApiErrorResponse>(response);

      if (!response.ok) {
        setErrorMessage(responseBody?.message ?? "Không thể xóa bình luận.");
        return;
      }

      setComments((currentComments) => currentComments.filter((currentComment) => currentComment.id !== comment.id));
      setFeedbackMessage("Đã xóa bình luận.");
    } catch {
      setErrorMessage("Không thể kết nối đến API bình luận.");
    } finally {
      setBusyCommentId(null);
    }
  }

  return (
    <Card className="gap-0 py-0 shadow-md">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg">Danh sách bình luận</CardTitle>
        <CardDescription>Duyệt, từ chối, đánh dấu spam hoặc xóa bình luận.</CardDescription>
      </CardHeader>
      {feedbackMessage ? (
        <div className="mx-4 mt-4 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {feedbackMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}
      {comments.length === 0 ? (
        <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
          <div className="flex size-14 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
            <MessageSquare className="size-5" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold">Chưa có bình luận</p>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Bình luận mới từ độc giả sẽ xuất hiện ở đây để duyệt.
            </p>
          </div>
        </CardContent>
      ) : (
        <CardContent className="overflow-x-auto px-0 pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[320px]">Comment</TableHead>
                <TableHead>Post</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[300px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comments.map((comment) => {
                const isBusy = busyCommentId === comment.id;

                return (
                  <TableRow key={comment.id}>
                    <TableCell>
                      <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {comment.content}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
                    </TableCell>
                    <TableCell>
                      <Button
                        nativeButton={false}
                        render={<Link href={`/blog/${comment.post.slug}`} target="_blank" />}
                        size="sm"
                        variant="link"
                      >
                        {comment.post.title}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{comment.author.name ?? "Reader"}</p>
                        <p className="text-xs text-muted-foreground">{comment.author.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(comment.status)}>{comment.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={Boolean(busyCommentId) || comment.status === CommentStatus.APPROVED}
                          onClick={() => {
                            void updateCommentStatus(comment.id, CommentStatus.APPROVED);
                          }}
                          size="sm"
                          type="button"
                        >
                          {isBusy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                          Approve
                        </Button>
                        <Button
                          disabled={Boolean(busyCommentId) || comment.status === CommentStatus.REJECTED}
                          onClick={() => {
                            void updateCommentStatus(comment.id, CommentStatus.REJECTED);
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <X className="size-3.5" />
                          Disable
                        </Button>
                        <Button
                          disabled={Boolean(busyCommentId) || comment.status === CommentStatus.SPAM}
                          onClick={() => {
                            void updateCommentStatus(comment.id, CommentStatus.SPAM);
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <ShieldBan className="size-3.5" />
                          Spam
                        </Button>
                        <Button
                          className={cn(isBusy ? "cursor-wait" : "")}
                          disabled={Boolean(busyCommentId)}
                          onClick={() => {
                            void deleteComment(comment);
                          }}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
