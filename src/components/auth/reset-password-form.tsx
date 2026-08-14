"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiErrorResponse = {
  message?: string;
  fields?: Record<string, string[]>;
};

type ResetPasswordFormProps = {
  token: string | null;
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

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasToken = Boolean(token?.trim());

  function getFieldError(field: "password" | "confirmPassword") {
    return fieldErrors[field]?.[0];
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || !hasToken) {
      return;
    }

    setFieldErrors({});
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setFieldErrors({
        confirmPassword: ["Mật khẩu xác nhận không khớp."],
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/readers/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });
      const responseBody = await parseJsonResponse<ApiErrorResponse>(response);

      if (!response.ok) {
        setFieldErrors(responseBody?.fields ?? {});
        setErrorMessage(
          responseBody?.message === "Reset link is invalid or expired."
            ? "Link đặt lại không hợp lệ hoặc đã hết hạn. Yêu cầu link mới."
            : (responseBody?.message ?? "Không thể đặt lại mật khẩu lúc này.")
        );
        setIsSubmitting(false);
        return;
      }

      // Keep spinner until navigation unmounts this page.
      router.replace("/login?reset=1");
    } catch {
      setErrorMessage("Không thể đặt lại mật khẩu lúc này.");
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md shadow-lg">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg border border-border bg-muted">
          <LockKeyhole className="size-5" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl">Đặt lại mật khẩu</CardTitle>
          <CardDescription>
            {hasToken
              ? "Nhập mật khẩu mới cho tài khoản của bạn."
              : "Thiếu token đặt lại. Hãy mở link trong email hoặc yêu cầu lại."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {!hasToken ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Link không hợp lệ. Quay lại trang quên mật khẩu để nhận link mới.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="reset-password">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  aria-invalid={Boolean(getFieldError("password"))}
                  autoComplete="new-password"
                  className="pr-11"
                  disabled={isSubmitting}
                  id="reset-password"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.password;
                      return next;
                    });
                    setErrorMessage(null);
                  }}
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                />
                <Button
                  aria-label={isPasswordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute top-1/2 right-1.5 size-8 -translate-y-1/2"
                  onClick={() => {
                    setIsPasswordVisible((currentValue) => !currentValue);
                  }}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  {isPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {getFieldError("password") ? (
                <p className="text-sm text-destructive">{getFieldError("password")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Xác nhận mật khẩu</Label>
              <Input
                aria-invalid={Boolean(getFieldError("confirmPassword"))}
                autoComplete="new-password"
                disabled={isSubmitting}
                id="reset-confirm-password"
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setFieldErrors((current) => {
                    const next = { ...current };
                    delete next.confirmPassword;
                    return next;
                  });
                  setErrorMessage(null);
                }}
                type={isPasswordVisible ? "text" : "password"}
                value={confirmPassword}
              />
              {getFieldError("confirmPassword") ? (
                <p className="text-sm text-destructive">{getFieldError("confirmPassword")}</p>
              ) : null}
            </div>

            {errorMessage ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Cập nhật mật khẩu
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col justify-center gap-2 border-t pt-5 sm:flex-row">
        {!hasToken ? (
          <Button nativeButton={false} render={<Link href="/forgot-password" />} variant="link">
            Quên mật khẩu
          </Button>
        ) : null}
        <Button nativeButton={false} render={<Link href="/login" />} variant="link">
          Về đăng nhập
        </Button>
      </CardFooter>
    </Card>
  );
}
