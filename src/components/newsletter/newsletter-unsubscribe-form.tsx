"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type NewsletterUnsubscribeFormProps = {
  token: string;
};

export function NewsletterUnsubscribeForm({ token }: NewsletterUnsubscribeFormProps) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        email?: string;
      } | null;

      if (!response.ok) {
        setState("error");
        setMessage(body?.message ?? "Không hủy được đăng ký.");
        return;
      }

      setState("done");
      setMessage(
        body?.email
          ? `Đã hủy đăng ký cho ${body.email}.`
          : "Đã hủy đăng ký newsletter."
      );
    } catch {
      setState("error");
      setMessage("Không hủy được đăng ký.");
    }
  }

  if (state === "done") {
    return <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>;
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <Button disabled={state === "loading"} type="submit" variant="destructive">
        {state === "loading" ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Xác nhận hủy đăng ký
      </Button>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </form>
  );
}
