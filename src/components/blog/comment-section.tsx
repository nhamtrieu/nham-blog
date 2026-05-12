"use client";

import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";
import { LoaderCircle, MessageCircle, Send } from "lucide-react";

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

export function CommentSection({
  slug,
  loginHref,
  currentUser,
  initialComments,
}: CommentSectionProps) {
  const [comments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const contentError = fieldErrors.content?.[0];

  async function submitComment() {
    setErrorMessage(null);
    setFeedbackMessage(null);
    setFieldErrors({});

    const response = await fetch(`/api/posts/${slug}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });
    const responseBody = await parseJsonResponse<ApiErrorResponse>(response);

    if (!response.ok) {
      setFieldErrors(responseBody?.fields ?? {});
      setErrorMessage(responseBody?.message ?? "Khong the gui binh luan luc nay.");
      return;
    }

    setContent("");
    setFeedbackMessage("Binh luan da duoc gui va dang cho duyet.");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    startTransition(() => {
      void submitComment();
    });
  }

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
          <MessageCircle className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Bình luận</h2>
          <p className="text-sm text-slate-500">{comments.length} bình luận đã duyệt</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Chưa có bình luận nào được duyệt.
          </div>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="font-medium text-slate-900">{comment.author.name ?? "Độc giả"}</p>
                <time className="text-xs text-slate-500" dateTime={comment.createdAt}>
                  {formatCommentDate(comment.createdAt)}
                </time>
              </header>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{comment.content}</p>
            </article>
          ))
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        {currentUser ? (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Textarea
                aria-invalid={Boolean(contentError)}
                disabled={isPending}
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
                placeholder="Viết bình luận..."
                rows={4}
                value={content}
              />
              {contentError ? <p className="text-sm text-red-600">{contentError}</p> : null}
            </div>
            {feedbackMessage ? <p className="text-sm text-emerald-700">{feedbackMessage}</p> : null}
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            <Button disabled={isPending} type="submit">
              {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              Gửi bình luận
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">Đăng nhập để gửi bình luận.</p>
            <Button nativeButton={false} render={<Link href={loginHref} />}>
              Đăng nhập
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
