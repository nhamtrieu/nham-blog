"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Filter, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AdminPostsFilterStatusOption = {
  label: string;
  value: string;
};

type AdminPostsFilterFormProps = {
  defaultSearch: string;
  defaultStatus: string;
  hasActiveFilters: boolean;
  resetHref: string;
  statusOptions: readonly AdminPostsFilterStatusOption[];
};

export function AdminPostsFilterForm({
  defaultSearch,
  defaultStatus,
  hasActiveFilters,
  resetHref,
  statusOptions,
}: AdminPostsFilterFormProps) {
  const [statusValue, setStatusValue] = useState(defaultStatus);

  useEffect(() => {
    setStatusValue(defaultStatus);
  }, [defaultStatus]);

  return (
    <form className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-4" method="get">
      <div className="relative min-w-0 flex-1 lg:max-w-md xl:max-w-lg">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Tim bai viet theo title"
          className="h-10 pl-10"
          defaultValue={defaultSearch}
          name="q"
          placeholder="Tim theo title..."
          type="search"
        />
      </div>

      <div className="relative w-full min-w-0 shrink-0 lg:w-56">
        <Filter className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <Select
          name="status"
          onValueChange={(value) => {
            setStatusValue(value ?? "ALL");
          }}
          value={statusValue}
        >
          <SelectTrigger
            aria-label="Loc bai viet theo status"
            className="w-full min-w-0 border-border pl-10 shadow-xs"
            size="lg"
          >
            <SelectValue placeholder="Trang thai" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-stretch gap-2 lg:items-center lg:shrink-0">
        <Button className="min-h-10" type="submit">
          <Search className="size-4 opacity-80" />
          Ap dung
        </Button>
        {hasActiveFilters ? (
          <Button className="min-h-10" nativeButton={false} render={<Link href={resetHref} />} variant="outline">
            <X className="size-4" />
            Xoa loc
          </Button>
        ) : null}
      </div>
    </form>
  );
}
