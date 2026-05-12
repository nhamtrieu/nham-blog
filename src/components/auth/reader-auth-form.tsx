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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPending, startTransition] = useTransition();
  const callbackUrl = normalizeDestination(searchParams.get("callbackUrl"));

  function getFieldError(field: "email" | "name" | "password") {
    return fieldErrors[field]?.[0];
  }

  function clearMessages(field?: "email" | "name" | "password") {
    setErrorMessage(null);

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
      setErrorMessage("Email hoặc mật khẩu không đúng.");
      return;
    }

    router.replace(callbackUrl);
    router.refresh();
  }

  async function submitRegister() {
    const response = await fetch("/api/readers/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formValues),
    });
    const responseBody = await parseJsonResponse<ApiErrorResponse>(response);

    if (!response.ok) {
      setFieldErrors(responseBody?.fields ?? {});
      setErrorMessage(responseBody?.message ?? "Khong the tao tai khoan luc nay.");
      return;
    }

    await submitLogin();
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

          <Button className="w-full" disabled={isPending} size="lg" type="submit">
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
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
