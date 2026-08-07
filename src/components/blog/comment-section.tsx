"use client";

import Link from "next/link";
import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Reply,
  Send,
  Trash2,
  X,
} from "lucide-react";

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
import { cn } from "@/lib/utils";

export type PublicCommentView = {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
  };
};

type CommentNode = PublicCommentView & {
  depth: number;
  replies: CommentNode[];
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
    parentId?: string | null;
    content: string;
    createdAt: string;
    author: {
      id: string;
      name: string | null;
    };
  };
};

const MAX_REPLY_DEPTH = 5;

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
    parentId: comment.parentId ?? null,
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

function buildCommentTree(comments: PublicCommentView[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();

  for (const comment of comments) {
    nodes.set(comment.id, {
      ...comment,
      depth: 0,
      replies: [],
    });
  }

  const roots: CommentNode[] = [];

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      const parent = nodes.get(node.parentId)!;
      node.depth = parent.depth + 1;
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortReplies = (items: CommentNode[]) => {
    items.sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    for (const item of items) {
      sortReplies(item.replies);
    }
  };

  roots.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  for (const root of roots) {
    sortReplies(root.replies);
  }

  return roots;
}

function parseCommentHash(hash: string) {
  const match = /^#comment-(.+)$/.exec(hash);

  return match?.[1] ?? null;
}

function mapApiCommentItems(
  items: Array<{
    id: string;
    parentId?: string | null;
    content: string;
    createdAt: string | Date;
    author: { id: string; name: string | null };
  }>
): PublicCommentView[] {
  return items.map((comment) => ({
    id: comment.id,
    parentId: comment.parentId ?? null,
    content: comment.content,
    createdAt:
      typeof comment.createdAt === "string"
        ? comment.createdAt
        : new Date(comment.createdAt).toISOString(),
    author: comment.author,
  }));
}

function collectDescendantIds(rootId: string, comments: PublicCommentView[]) {
  const childrenByParent = new Map<string, string[]>();

  for (const comment of comments) {
    if (!comment.parentId) {
      continue;
    }

    const siblings = childrenByParent.get(comment.parentId) ?? [];
    siblings.push(comment.id);
    childrenByParent.set(comment.parentId, siblings);
  }

  const ids = new Set<string>([rootId]);
  const stack = [rootId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    const children = childrenByParent.get(currentId) ?? [];

    for (const childId of children) {
      if (!ids.has(childId)) {
        ids.add(childId);
        stack.push(childId);
      }
    }
  }

  return ids;
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
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentIdToDelete, setCommentIdToDelete] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const isSubmittingRef = useRef(false);
  const isSubmittingReplyRef = useRef(false);
  const deletingCommentIdRef = useRef<string | null>(null);
  const isSavingEditRef = useRef(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingFocusCommentIdRef = useRef<string | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const contentError = fieldErrors.content?.[0];
  const canSubmit = content.trim().length > 0 && !isSubmitting;
  const canSubmitReply = replyContent.trim().length > 0 && !isSubmittingReply;
  const canSaveEdit = editContent.trim().length > 0 && !isSavingEdit;
  const isDeleteDialogOpen = commentIdToDelete !== null;
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  async function refreshCommentsFromApi() {
    const response = await fetch(`/api/posts/${slug}/comments`);

    if (!response.ok) {
      return;
    }

    const body = await parseJsonResponse<{ items?: Parameters<typeof mapApiCommentItems>[0] }>(
      response
    );

    if (!body?.items) {
      return;
    }

    setComments(mapApiCommentItems(body.items));
  }

  function queueCommentFocus(commentId: string) {
    pendingFocusCommentIdRef.current = commentId;
  }

  async function focusCommentFromHash(hash = window.location.hash) {
    const commentId = parseCommentHash(hash);

    if (!commentId) {
      return;
    }

    queueCommentFocus(commentId);

    // Soft-nav / same-page notification click keeps stale client list — refetch first.
    try {
      await refreshCommentsFromApi();
    } catch {
      // fall through; scroll still runs if comment already in state
    }

    setFocusNonce((current) => current + 1);
  }

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

  useEffect(() => {
    if (!replyParentId) {
      return;
    }

    replyTextareaRef.current?.focus();
  }, [replyParentId]);

  useEffect(() => {
    void focusCommentFromHash();

    function onHashChange() {
      void focusCommentFromHash();
    }

    function onFocusComment(event: Event) {
      const commentId = (event as CustomEvent<{ commentId?: string }>).detail?.commentId;

      if (!commentId) {
        return;
      }

      window.history.replaceState(null, "", `#comment-${commentId}`);
      void focusCommentFromHash(`#comment-${commentId}`);
    }

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("blog:focus-comment", onFocusComment);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("blog:focus-comment", onFocusComment);
    };
    // ponytail: remount listeners when slug changes; handlers close over latest slug via refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount/slug-only
  }, [slug]);

  useEffect(() => {
    const commentId = pendingFocusCommentIdRef.current;

    if (!commentId || !comments.some((comment) => comment.id === commentId)) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`comment-${commentId}`);

      if (!element) {
        return;
      }

      pendingFocusCommentIdRef.current = null;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedCommentId(commentId);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [comments, focusNonce]);

  useEffect(() => {
    if (!highlightedCommentId) {
      return;
    }

    const clearHighlight = window.setTimeout(() => {
      setHighlightedCommentId(null);
    }, 2500);

    return () => {
      window.clearTimeout(clearHighlight);
    };
  }, [highlightedCommentId]);

  async function submitComment(params: {
    body: { content: string; parentId?: string };
    onSuccess: (comment: PublicCommentView) => void;
    setBusy: (value: boolean) => void;
    busyRef: { current: boolean };
    onError: (message: string, fields?: Record<string, string[]>) => void;
  }) {
    if (params.busyRef.current) {
      return;
    }

    params.busyRef.current = true;
    params.setBusy(true);

    try {
      const response = await fetch(`/api/posts/${slug}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params.body),
      });
      const responseBody = await parseJsonResponse<CommentMutationResponse>(response);

      if (!response.ok) {
        params.onError(
          responseBody?.message ?? "Không thể gửi bình luận lúc này.",
          responseBody?.fields
        );
        return;
      }

      if (responseBody?.comment) {
        params.onSuccess(toCommentView(responseBody.comment));
      }
    } finally {
      params.busyRef.current = false;
      params.setBusy(false);
    }
  }

  async function submitRootComment() {
    if (content.trim().length === 0) {
      return;
    }

    setErrorMessage(null);
    setFeedbackMessage(null);
    setFieldErrors({});

    await submitComment({
      body: { content },
      busyRef: isSubmittingRef,
      setBusy: setIsSubmitting,
      onError: (message, fields) => {
        setFieldErrors(fields ?? {});
        setErrorMessage(message);
      },
      onSuccess: (comment) => {
        queueCommentFocus(comment.id);
        setComments((current) => [comment, ...current]);
        setContent("");
        setFeedbackMessage("Bình luận đã được đăng.");
        window.history.replaceState(null, "", `#comment-${comment.id}`);
      },
    });
  }

  async function submitReply(parentId: string) {
    if (replyContent.trim().length === 0) {
      return;
    }

    setReplyError(null);
    setErrorMessage(null);
    setFeedbackMessage(null);

    await submitComment({
      body: { content: replyContent, parentId },
      busyRef: isSubmittingReplyRef,
      setBusy: setIsSubmittingReply,
      onError: (message) => {
        setReplyError(message);
      },
      onSuccess: (comment) => {
        queueCommentFocus(comment.id);
        setComments((current) => [...current, comment]);
        setReplyParentId(null);
        setReplyContent("");
        setFeedbackMessage("Đã gửi trả lời.");
        window.history.replaceState(null, "", `#comment-${comment.id}`);
      },
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitRootComment();
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) {
      return;
    }

    event.preventDefault();
    void submitRootComment();
  }

  function startEditing(comment: PublicCommentView) {
    if (deletingCommentIdRef.current || isSavingEditRef.current) {
      return;
    }

    setEditingCommentId(comment.id);
    setEditContent(comment.content);
    setEditErrorMessage(null);
    setReplyParentId(null);
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
            comment.id === commentId
              ? { ...updatedComment, parentId: comment.parentId }
              : comment
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

      const removeIds = collectDescendantIds(commentId, comments);
      setComments((currentComments) =>
        currentComments.filter((comment) => !removeIds.has(comment.id))
      );

      if (editingCommentId && removeIds.has(editingCommentId)) {
        cancelEditing();
      }

      if (replyParentId && removeIds.has(replyParentId)) {
        setReplyParentId(null);
        setReplyContent("");
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

  function renderCommentNode(node: CommentNode) {
    const isOwnComment = currentUser?.id === node.author.id;
    const isDeleting = deletingCommentId === node.id;
    const isEditing = editingCommentId === node.id;
    const isReplying = replyParentId === node.id;
    const actionsDisabled = Boolean(deletingCommentId) || isSavingEdit || isSubmittingReply;
    const canReply = Boolean(currentUser) && node.depth < MAX_REPLY_DEPTH && !isEditing;

    return (
      <div key={node.id} className="space-y-3" id={`comment-${node.id}`}>
        <article
          className={cn(
            "rounded-xl border border-border bg-muted/40 p-4 transition-shadow",
            node.depth > 0 && "border-l-2 border-l-primary/40",
            highlightedCommentId === node.id && "ring-2 ring-primary shadow-md"
          )}
          style={node.depth > 0 ? { marginLeft: Math.min(node.depth, 4) * 12 } : undefined}
        >
          <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-medium text-foreground">{node.author.name ?? "Độc giả"}</p>
              <time className="text-xs text-muted-foreground" dateTime={node.createdAt}>
                {formatCommentDate(node.createdAt)}
              </time>
            </div>
            <div className="flex flex-wrap gap-1">
              {canReply ? (
                <Button
                  disabled={actionsDisabled}
                  onClick={() => {
                    setReplyParentId(node.id);
                    setReplyContent("");
                    setReplyError(null);
                    setEditingCommentId(null);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Reply className="size-3.5" />
                  Trả lời
                </Button>
              ) : null}
              {isOwnComment && !isEditing ? (
                <>
                  <Button
                    aria-label="Sửa bình luận"
                    disabled={actionsDisabled}
                    onClick={() => {
                      startEditing(node);
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
                      setCommentIdToDelete(node.id);
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
                </>
              ) : null}
            </div>
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
                  handleEditKeyDown(event, node.id);
                }}
                ref={editTextareaRef}
                rows={4}
                value={editContent}
              />
              <p className="text-xs text-muted-foreground">Ctrl+Enter để lưu · Esc để hủy</p>
              {editErrorMessage ? <p className="text-sm text-destructive">{editErrorMessage}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  aria-busy={isSavingEdit}
                  disabled={!canSaveEdit}
                  onClick={() => {
                    void saveOwnComment(node.id);
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
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/85">{node.content}</p>
          )}

          {isReplying ? (
            <div className="mt-4 space-y-3 rounded-lg border border-border bg-background p-3">
              <Textarea
                disabled={isSubmittingReply}
                maxLength={2000}
                onChange={(event) => {
                  setReplyContent(event.target.value);
                  setReplyError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setReplyParentId(null);
                    setReplyContent("");
                    setReplyError(null);
                    return;
                  }

                  if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) {
                    return;
                  }

                  event.preventDefault();
                  void submitReply(node.id);
                }}
                placeholder={`Trả lời ${node.author.name ?? "độc giả"}...`}
                ref={replyTextareaRef}
                rows={3}
                value={replyContent}
              />
              <p className="text-xs text-muted-foreground">Ctrl+Enter để gửi · Esc để hủy</p>
              {replyError ? <p className="text-sm text-destructive">{replyError}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  aria-busy={isSubmittingReply}
                  disabled={!canSubmitReply}
                  onClick={() => {
                    void submitReply(node.id);
                  }}
                  size="sm"
                  type="button"
                >
                  {isSubmittingReply ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  {isSubmittingReply ? "Đang gửi..." : "Gửi trả lời"}
                </Button>
                <Button
                  disabled={isSubmittingReply}
                  onClick={() => {
                    setReplyParentId(null);
                    setReplyContent("");
                    setReplyError(null);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Hủy
                </Button>
              </div>
            </div>
          ) : null}
        </article>

        {node.replies.length > 0 ? (
          <div className="space-y-3">{node.replies.map((reply) => renderCommentNode(reply))}</div>
        ) : null}
      </div>
    );
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
        {commentTree.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
            Chưa có bình luận nào.
          </div>
        ) : (
          commentTree.map((node) => renderCommentNode(node))
        )}
      </div>

      <AlertDialog onOpenChange={handleDeleteDialogOpenChange} open={isDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bình luận?</AlertDialogTitle>
            <AlertDialogDescription>
              Bình luận và các trả lời bên trong sẽ bị xóa vĩnh viễn và không thể hoàn tác.
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
