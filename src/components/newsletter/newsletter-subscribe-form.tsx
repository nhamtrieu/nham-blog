"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NewsletterSubscribeFormProps = {
  source?: string;
  defaultEmail?: string;
  className?: string;
  compact?: boolean;
};

type FormState = "idle" | "loading" | "success" | "error";

export function NewsletterSubscribeForm({
  source = "footer",
  defaultEmail = "",
  className,
  compact = false,
}: NewsletterSubscribeFormProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (state === "loading") {
      return;
    }

    setState("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        fields?: { email?: string[] };
      } | null;

      if (!response.ok) {
        setState("error");
        setMessage(
          body?.fields?.email?.[0] ??
            body?.message ??
            "Không thể đăng ký lúc này. Vui lòng thử lại."
        );
        return;
      }

      setState("success");
      setMessage(body?.message ?? "Kiểm tra email để xác nhận đăng ký.");
      setEmail("");
    } catch {
      setState("error");
      setMessage("Không thể đăng ký lúc này. Vui lòng thử lại.");
    }
  }

  return (
    <form
      className={cn("space-y-3", className)}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      {!compact ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Nhận bài mới qua email</p>
          <p className="text-sm text-muted-foreground">
            Double opt-in — chỉ gửi khi có bài mới. Có thể hủy bất cứ lúc nào.
          </p>
        </div>
      ) : null}

      <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", compact && "sm:max-w-md")}>
        <div className="relative min-w-0 flex-1">
          <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Email đăng ký newsletter"
            autoComplete="email"
            className="h-10 pl-9"
            disabled={state === "loading" || state === "success"}
            inputMode="email"
            name="email"
            onChange={(event) => {
              setEmail(event.target.value);
              if (state === "error") {
                setState("idle");
                setMessage(null);
              }
            }}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </div>
        <Button
          className="h-10 shrink-0"
          disabled={state === "loading" || state === "success"}
          type="submit"
        >
          {state === "loading" ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Đăng ký
        </Button>
      </div>

      {message ? (
        <p
          className={cn(
            "text-sm",
            state === "success" && "text-emerald-700 dark:text-emerald-400",
            state === "error" && "text-destructive",
            state !== "success" && state !== "error" && "text-muted-foreground"
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
