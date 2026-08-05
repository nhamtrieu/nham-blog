"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type PublicSearchButtonProps = {
  initialQuery?: string;
};

export function PublicSearchButton({ initialQuery = "" }: PublicSearchButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    setOpen(false);

    if (!normalizedQuery) {
      router.push("/blog");
      return;
    }

    router.push(`/blog?q=${encodeURIComponent(normalizedQuery)}`);
  }

  return (
    <Sheet
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setQuery(initialQuery);
        }
      }}
      open={open}
    >
      <SheetTrigger
        render={
          <Button aria-label="Tìm kiếm bài viết" size="icon-sm" type="button" variant="ghost" />
        }
      >
        <Search className="size-4" />
      </SheetTrigger>
      <SheetContent className="p-6" side="top">
        <SheetHeader className="px-0 text-left">
          <SheetTitle>Tìm kiếm</SheetTitle>
          <SheetDescription>Tìm bài viết theo tiêu đề trên blog.</SheetDescription>
        </SheetHeader>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="public-search-query">Từ khóa</Label>
            <Input
              autoFocus
              id="public-search-query"
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder="Ví dụ: Next.js, TypeORM..."
              value={query}
            />
          </div>
          <Button className="w-full sm:w-auto" type="submit">
            <Search className="size-4" />
            Tìm kiếm
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
