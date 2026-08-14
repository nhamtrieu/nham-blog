"use client";

import Link from "next/link";
import { KeyRound, LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFieldError(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/readers/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const responseBody = await parseJsonResponse<ApiErrorResponse & { ok?: boolean }>(
        response
      );

      if (!response.ok) {
        setFieldError(responseBody?.fields?.email?.[0] ?? null);
        setErrorMessage(responseBody?.message ?? "Không thể gửi yêu cầu lúc này.");
        return;
      }

      setSuccessMessage(
        responseBody?.message ??
        "Nếu email tồn tại và có mật khẩu, chúng tôi đã gửi link đặt lại. Kiểm tra hộp thư (và spam)."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md shadow-lg">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg border border-border bg-muted">
          <KeyRound className="size-5" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl">Quên mật khẩu</CardTitle>
          <CardDescription>
            Nhập email tài khoản. Nếu hợp lệ, chúng tôi sẽ gửi link đặt lại mật khẩu.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              aria-invalid={Boolean(fieldError)}
              autoComplete="email"
              disabled={isSubmitting || Boolean(successMessage)}
              id="forgot-email"
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldError(null);
                setErrorMessage(null);
              }}
              type="email"
              value={email}
            />
            {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
              {successMessage}
            </div>
          ) : null}

          {!successMessage ? (
            <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Gửi link đặt lại
            </Button>
          ) : null}
        </form>
      </CardContent>
      <CardFooter className="flex flex-col justify-center gap-2 border-t pt-5 sm:flex-row">
        <Button nativeButton={false} render={<Link href="/login" />} variant="link">
          Về đăng nhập
        </Button>
        <Button nativeButton={false} render={<Link href="/" />} variant="link">
          Về trang chủ
        </Button>
      </CardFooter>
    </Card>
  );
}
