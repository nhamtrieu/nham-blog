"use client";

import Link from "next/link";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, MessageCircle, Pencil, Send, Trash2, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type PublicCommentView = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
  };
};

type CommentSectionProps = {
  slug: string;
  loginHref: string;
  currentUser: {
    id: string;
    name: string | null;
  } | null;
  initialComments: PublicCommentView[];
};

type ApiErrorResponse = {
  message?: string;
  fields?: Record<string, string[]>;
};

type CommentMutationResponse = ApiErrorResponse & {
  comment?: {
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      name: string | null;
    };
  };
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

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toCommentView(comment: NonNullable<CommentMutationResponse["comment"]>): PublicCommentView {
  return {
    id: comment.id,
    content: comment.content,
    createdAt:
      typeof comment.createdAt === "string"
        ? comment.createdAt
        : new Date(comment.createdAt).toISOString(),
    author: {
      id: comment.author.id,
      name: comment.author.name,
    },
  };
}

export function CommentSection({
  slug,
  loginHref,
  currentUser,
  initialComments,
}: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentIdToDelete, setCommentIdToDelete] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const isSubmittingRef = useRef(false);
  const deletingCommentIdRef = useRef<string | null>(null);
  const isSavingEditRef = useRef(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const contentError = fieldErrors.content?.[0];
  const canSubmit = content.trim().length > 0 && !isSubmitting;
  const canSaveEdit = editContent.trim().length > 0 && !isSavingEdit;
  const isDeleteDialogOpen = commentIdToDelete !== null;

  useEffect(() => {
    if (!editingCommentId) {
      return;
    }

    const textarea = editTextareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.focus();
    const cursor = textarea.value.length;
    textarea.setSelectionRange(cursor, cursor);
  }, [editingCommentId]);

  async function submitComment() {
    if (content.trim().length === 0 || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    setFeedbackMessage(null);
    setFieldErrors({});

    try {
      const response = await fetch(`/api/posts/${slug}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      const responseBody = await parseJsonResponse<CommentMutationResponse>(response);

      if (!response.ok) {
        setFieldErrors(responseBody?.fields ?? {});
        setErrorMessage(responseBody?.message ?? "Không thể gửi bình luận lúc này.");
        return;
      }

      if (responseBody?.comment) {
        setComments((currentComments) => [toCommentView(responseBody.comment!), ...currentComments]);
      }

      setContent("");
      setFeedbackMessage("Bình luận đã được đăng.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitComment();
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) {
      return;
    }

    event.preventDefault();
    void submitComment();
  }

  function startEditing(comment: PublicCommentView) {
    if (deletingCommentIdRef.current || isSavingEditRef.current) {
      return;
    }

    setEditingCommentId(comment.id);
    setEditContent(comment.content);
    setEditErrorMessage(null);
    setErrorMessage(null);
    setFeedbackMessage(null);
  }

  function cancelEditing() {
    if (isSavingEditRef.current) {
      return;
    }

    setEditingCommentId(null);
    setEditContent("");
    setEditErrorMessage(null);
  }

  async function saveOwnComment(commentId: string) {
    if (editContent.trim().length === 0 || isSavingEditRef.current) {
      return;
    }

    isSavingEditRef.current = true;
    setIsSavingEdit(true);
    setEditErrorMessage(null);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: editContent }),
      });
      const responseBody = await parseJsonResponse<CommentMutationResponse>(response);

      if (!response.ok) {
        setEditErrorMessage(
          responseBody?.fields?.content?.[0] ??
          responseBody?.message ??
          "Không thể sửa bình luận lúc này."
        );
        return;
      }

      if (responseBody?.comment) {
        const updatedComment = toCommentView(responseBody.comment);
        setComments((currentComments) =>
          currentComments.map((comment) =>
            comment.id === commentId ? updatedComment : comment
          )
        );
      }

      setEditingCommentId(null);
      setEditContent("");
      setFeedbackMessage("Đã cập nhật bình luận.");
    } finally {
      isSavingEditRef.current = false;
      setIsSavingEdit(false);
    }
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, commentId: string) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
      return;
    }

    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) {
      return;
    }

    event.preventDefault();
    void saveOwnComment(commentId);
  }

  async function deleteOwnComment(commentId: string) {
    if (deletingCommentIdRef.current || isSavingEditRef.current) {
      return;
    }

    deletingCommentIdRef.current = commentId;
    setDeletingCommentId(commentId);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const responseBody = await parseJsonResponse<ApiErrorResponse>(response);
        setErrorMessage(responseBody?.message ?? "Không thể xóa bình luận lúc này.");
        return;
      }

      setComments((currentComments) =>
        currentComments.filter((comment) => comment.id !== commentId)
      );

      if (editingCommentId === commentId) {
        cancelEditing();
      }

      setCommentIdToDelete(null);
      setFeedbackMessage("Đã xóa bình luận.");
    } finally {
      deletingCommentIdRef.current = null;
      setDeletingCommentId(null);
    }
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    if (open || deletingCommentIdRef.current) {
      return;
    }

    setCommentIdToDelete(null);
  }

  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          <MessageCircle className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Bình luận</h2>
          <p className="text-sm text-muted-foreground">{comments.length} bình luận</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
            Chưa có bình luận nào.
          </div>
        ) : (
          comments.map((comment) => {
            const isOwnComment = currentUser?.id === comment.author.id;
            const isDeleting = deletingCommentId === comment.id;
            const isEditing = editingCommentId === comment.id;
            const actionsDisabled = Boolean(deletingCommentId) || isSavingEdit;

            return (
              <article key={comment.id} className="rounded-xl border border-border bg-muted/40 p-4">
                <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-medium text-foreground">{comment.author.name ?? "Độc giả"}</p>
                    <time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>
                      {formatCommentDate(comment.createdAt)}
                    </time>
                  </div>
                  {isOwnComment && !isEditing ? (
                    <div className="flex flex-wrap gap-1">
                      <Button
                        aria-label="Sửa bình luận"
                        disabled={actionsDisabled}
                        onClick={() => {
                          startEditing(comment);
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil className="size-3.5" />
                        Sửa
                      </Button>
                      <Button
                        aria-busy={isDeleting}
                        aria-label="Xóa bình luận"
                        disabled={actionsDisabled}
                        onClick={() => {
                          setCommentIdToDelete(comment.id);
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {isDeleting ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        Xóa
                      </Button>
                    </div>
                  ) : null}
                </header>

                {isEditing ? (
                  <div className="mt-3 space-y-3">
                    <Textarea
                      disabled={isSavingEdit}
                      maxLength={2000}
                      onChange={(event) => {
                        setEditContent(event.target.value);
                        setEditErrorMessage(null);
                      }}
                      onKeyDown={(event) => {
                        handleEditKeyDown(event, comment.id);
                      }}
                      ref={editTextareaRef}
                      rows={4}
                      value={editContent}
                    />
                    <p className="text-xs text-muted-foreground">Ctrl+Enter để lưu · Esc để hủy</p>
                    {editErrorMessage ? (
                      <p className="text-sm text-destructive">{editErrorMessage}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        aria-busy={isSavingEdit}
                        disabled={!canSaveEdit}
                        onClick={() => {
                          void saveOwnComment(comment.id);
                        }}
                        size="sm"
                        type="button"
                      >
                        {isSavingEdit ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        {isSavingEdit ? "Đang lưu..." : "Lưu"}
                      </Button>
                      <Button
                        disabled={isSavingEdit}
                        onClick={cancelEditing}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <X className="size-3.5" />
                        Hủy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/85">
                    {comment.content}
                  </p>
                )}
              </article>
            );
          })
        )}
      </div>

      <AlertDialog onOpenChange={handleDeleteDialogOpenChange} open={isDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bình luận?</AlertDialogTitle>
            <AlertDialogDescription>
              Bình luận sẽ bị xóa vĩnh viễn và không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose
              disabled={Boolean(deletingCommentId)}
              render={<Button type="button" variant="outline" />}
            >
              Hủy
            </AlertDialogClose>
            <Button
              disabled={!commentIdToDelete || Boolean(deletingCommentId)}
              onClick={() => {
                if (!commentIdToDelete) {
                  return;
                }

                void deleteOwnComment(commentIdToDelete);
              }}
              type="button"
              variant="destructive"
            >
              {deletingCommentId ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              {deletingCommentId ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-6 rounded-xl border border-border bg-background p-4">
        {currentUser ? (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Textarea
                aria-invalid={Boolean(contentError)}
                disabled={isSubmitting}
                maxLength={2000}
                onChange={(event) => {
                  setContent(event.target.value);
                  setErrorMessage(null);
                  setFeedbackMessage(null);
                  if (contentError) {
                    setFieldErrors((currentErrors) => {
                      const nextErrors = { ...currentErrors };
                      delete nextErrors.content;
                      return nextErrors;
                    });
                  }
                }}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Viết bình luận..."
                rows={4}
                value={content}
              />
              <p className="text-xs text-muted-foreground">Ctrl+Enter để gửi</p>
              {contentError ? <p className="text-sm text-destructive">{contentError}</p> : null}
            </div>
            {feedbackMessage ? <p className="text-sm text-primary">{feedbackMessage}</p> : null}
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            <Button aria-busy={isSubmitting} disabled={!canSubmit} type="submit">
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {isSubmitting ? "Đang gửi..." : "Gửi bình luận"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Đăng nhập để gửi bình luận.</p>
            <Button nativeButton={false} render={<Link href={loginHref} />}>
              Đăng nhập
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
