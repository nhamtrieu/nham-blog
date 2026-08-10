"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, LoaderCircle, LogIn, UserPlus } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type AuthMode = "login" | "register";

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

function normalizeDestination(destination: string | null) {
  if (!destination || !destination.startsWith("/")) {
    return "/";
  }

  return destination;
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function ReaderAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [formValues, setFormValues] = useState({
    email: "",
    name: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPending, startTransition] = useTransition();
  const callbackUrl = normalizeDestination(searchParams.get("callbackUrl"));
  const verifiedParam = searchParams.get("verified");

  function getFieldError(field: "email" | "name" | "password") {
    return fieldErrors[field]?.[0];
  }

  function clearMessages(field?: "email" | "name" | "password") {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!field) {
      setFieldErrors({});
      return;
    }

    if (getFieldError(field)) {
      setFieldErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  }

  async function submitLogin() {
    const result = await signIn("credentials", {
      redirect: false,
      email: formValues.email,
      password: formValues.password,
      callbackUrl,
    });

    if (!result || result.error) {
      setErrorMessage(
        result?.error === "LoginRateLimit"
          ? "Bạn đã thử đăng nhập quá nhiều lần. Đợi khoảng 10 phút rồi thử lại."
          : "Email hoặc mật khẩu không đúng."
      );
      return;
    }

    router.replace(callbackUrl);
    router.refresh();
  }

  function submitGoogleLogin() {
    if (isPending) {
      return;
    }

    clearMessages();
    startTransition(() => {
      void signIn("google", { callbackUrl }).then((result) => {
        if (result?.error) {
          setErrorMessage("Không thể đăng nhập bằng Google lúc này. Kiểm tra cấu hình OAuth.");
        }
      });
    });
  }

  async function submitRegister() {
    const response = await fetch("/api/readers/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formValues),
    });
    const responseBody = await parseJsonResponse<ApiErrorResponse & { verificationEmailWarning?: string }>(
      response
    );

    if (!response.ok) {
      setFieldErrors(responseBody?.fields ?? {});
      setErrorMessage(responseBody?.message ?? "Không thể tạo tài khoản lúc này.");
      return;
    }

    setMode("login");
    setSuccessMessage(
      responseBody?.verificationEmailWarning
        ? `${responseBody.verificationEmailWarning} Hãy đăng nhập.`
        : "Tạo tài khoản thành công. Kiểm tra email để xác thực, rồi đăng nhập."
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    clearMessages();
    startTransition(() => {
      void (mode === "login" ? submitLogin() : submitRegister());
    });
  }

  return (
    <Card className="mx-auto w-full max-w-md shadow-lg">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg border border-border bg-muted">
          {mode === "login" ? <LogIn className="size-5" /> : <UserPlus className="size-5" />}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl">{mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</CardTitle>
          <CardDescription>
            {mode === "login" ? "Dùng tài khoản độc giả để bình luận." : "Tạo tài khoản độc giả mới."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {verifiedParam === "1" ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
              Email đã được xác thực. Bạn có thể đăng nhập.
            </p>
          ) : null}
          {verifiedParam === "0" ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Link xác thực không hợp lệ hoặc đã hết hạn. Đăng nhập rồi bấm Gửi lại email.
            </p>
          ) : null}
          {mode === "register" ? (
            <div className="space-y-2">
              <Label htmlFor="reader-name">Tên hiển thị</Label>
              <Input
                aria-invalid={Boolean(getFieldError("name"))}
                disabled={isPending}
                id="reader-name"
                onChange={(event) => {
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    name: event.target.value,
                  }));
                  clearMessages("name");
                }}
                value={formValues.name}
              />
              {getFieldError("name") ? <p className="text-sm text-destructive">{getFieldError("name")}</p> : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="reader-email">Email</Label>
            <Input
              aria-invalid={Boolean(getFieldError("email"))}
              autoComplete="email"
              disabled={isPending}
              id="reader-email"
              onChange={(event) => {
                setFormValues((currentValues) => ({
                  ...currentValues,
                  email: event.target.value,
                }));
                clearMessages("email");
              }}
              type="email"
              value={formValues.email}
            />
            {getFieldError("email") ? <p className="text-sm text-destructive">{getFieldError("email")}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reader-password">Mật khẩu</Label>
            <div className="relative">
              <Input
                aria-invalid={Boolean(getFieldError("password"))}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="pr-11"
                disabled={isPending}
                id="reader-password"
                onChange={(event) => {
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    password: event.target.value,
                  }));
                  clearMessages("password");
                }}
                type={isPasswordVisible ? "text" : "password"}
                value={formValues.password}
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

          <Button className="w-full" disabled={isPending} size="lg" type="submit">
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </Button>

          <div className="flex items-center gap-3 py-1">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">hoặc</span>
            <Separator className="flex-1" />
          </div>

          <Button
            className="w-full"
            disabled={isPending}
            onClick={submitGoogleLogin}
            size="lg"
            type="button"
            variant="outline"
          >
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <GoogleMark className="size-4" />
            )}
            Tiếp tục với Google
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col justify-center gap-2 border-t pt-5 sm:flex-row">
        <Button
          disabled={isPending}
          onClick={() => {
            setMode((currentMode) => (currentMode === "login" ? "register" : "login"));
            clearMessages();
          }}
          type="button"
          variant="link"
        >
          {mode === "login" ? "Tạo tài khoản mới" : "Đã có tài khoản"}
        </Button>
        <Button nativeButton={false} render={<Link href="/" />} variant="link">
          Về trang chủ
        </Button>
      </CardFooter>
    </Card>
  );
}
