"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";

type CopyLinkButtonProps = {
  url: string;
  className?: string;
};

export function CopyLinkButton({ url, className }: CopyLinkButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2000);
    }
  }, [url]);

  const label =
    status === "copied" ? "Da sao chep" : status === "error" ? "Khong sao chep duoc" : "Sao chep lien ket";

  return (
    <Button className={className} onClick={handleCopy} type="button" variant="outline" size="sm">
      {label}
    </Button>
  );
}
