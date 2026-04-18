"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOGIN_RATE_LIMIT_ERROR_CODE } from "@/lib/auth/auth-error-codes";
import { ADMIN_HOME_PATH } from "@/lib/auth/auth-routes";
import { signInCredentialsSchema } from "@/lib/auth/sign-in-credentials";

const DEFAULT_CALLBACK_URL = ADMIN_HOME_PATH;
const FALLBACK_AUTH_ERROR = "Không thể đăng nhập lúc này. Vui lòng thử lại.";
const INVALID_CREDENTIALS_ERROR = "Email hoặc mật khẩu không đúng.";
const RATE_LIMIT_ERROR_MESSAGE =
  "Bạn thử sai quá nhiều lần. Vui lòng chờ ít phút rồi đăng nhập lại.";

function resolveAuthError(errorCode?: string | null) {
  if (!errorCode) {
    return null;
  }

  if (errorCode === "CredentialsSignin") {
    return INVALID_CREDENTIALS_ERROR;
  }

  if (errorCode === LOGIN_RATE_LIMIT_ERROR_CODE) {
    return RATE_LIMIT_ERROR_MESSAGE;
  }

  return FALLBACK_AUTH_ERROR;
}

function extractAuthErrorCode(
  result: { error?: string | null; url?: string | null } | null | undefined
) {
  if (!result) {
    return null;
  }

  if (result.error) {
    return result.error;
  }

  if (!result.url) {
    return null;
  }

  try {
    const url = new URL(result.url, window.location.origin);
    return url.searchParams.get("error");
  } catch {
    return null;
  }
}

function normalizeDestination(destination: string | null) {
  if (!destination) {
    return DEFAULT_CALLBACK_URL;
  }

  if (destination.startsWith("/")) {
    return destination;
  }

  try {
    const url = new URL(destination);

    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return DEFAULT_CALLBACK_URL;
  }

  return DEFAULT_CALLBACK_URL;
}

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  const callbackUrl = searchParams.get("callbackUrl") ?? DEFAULT_CALLBACK_URL;
  const urlErrorMessage = resolveAuthError(searchParams.get("error"));
  const displayedErrorMessage = errorMessage ?? urlErrorMessage;

  async function submitCredentials() {
    const parsedCredentials = signInCredentialsSchema.safeParse(formValues);

    if (!parsedCredentials.success) {
      setErrorMessage(parsedCredentials.error.issues[0]?.message ?? FALLBACK_AUTH_ERROR);
      return;
    }

    setErrorMessage(null);

    const result = await signIn("credentials", {
      redirect: false,
      email: parsedCredentials.data.email,
      password: parsedCredentials.data.password,
      callbackUrl,
    });

    const authErrorCode = extractAuthErrorCode(result);

    if (!result || authErrorCode) {
      setErrorMessage(resolveAuthError(authErrorCode) ?? FALLBACK_AUTH_ERROR);
      return;
    }

    router.replace(normalizeDestination(result.url));
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md shadow-lg">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-border bg-muted">
          <LockKeyhole className="size-5 text-foreground" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl">Đăng nhập</CardTitle>
          <CardDescription>Dùng tài khoản quản trị để tiếp tục.</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(() => {
              void submitCredentials();
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              autoComplete="email"
              disabled={isPending}
              id="admin-email"
              name="email"
              onChange={(event) => {
                setFormValues((currentValues) => ({
                  ...currentValues,
                  email: event.target.value,
                }));
                setErrorMessage(null);
              }}
              placeholder="admin@nham.blog"
              required
              spellCheck={false}
              type="email"
              value={formValues.email}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Mật khẩu</Label>
            <div className="relative">
              <Input
                autoComplete="current-password"
                className="pr-11"
                disabled={isPending}
                id="admin-password"
                name="password"
                onChange={(event) => {
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    password: event.target.value,
                  }));
                  setErrorMessage(null);
                }}
                placeholder="Nhập mật khẩu"
                required
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
          </div>

          {displayedErrorMessage ? (
            <div
              aria-live="polite"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
              role="alert"
            >
              {displayedErrorMessage}
            </div>
          ) : null}

          <Button className="w-full" disabled={isPending} size="lg" type="submit">
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {isPending ? "Đang đăng nhập..." : "Tiếp tục"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center border-t pt-6">
        <Button nativeButton={false} render={<Link href="/" />} variant="link">
          Quay lại trang chủ
        </Button>
      </CardFooter>
    </Card>
  );
}
