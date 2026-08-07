"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";

import { cn } from "@/lib/utils";

type MdxCodeEditorProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** admin shell uses nested `.dark` (not always on <html>) */
  appearance?: "auto" | "light" | "dark";
};

const InitializedMdxEditor = dynamic(() => import("./initialized-mdx-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-96 items-center justify-center rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
      Đang tải editor…
    </div>
  ),
});

export function MdxCodeEditor({
  id,
  value,
  onChange,
  className,
  appearance = "auto",
}: MdxCodeEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedMarkdownRef = useRef(value);
  const [isDark, setIsDark] = useState(appearance !== "light");

  useEffect(() => {
    if (appearance === "dark") {
      setIsDark(true);
      return;
    }

    if (appearance === "light") {
      setIsDark(false);
      return;
    }

    const sync = () => {
      const htmlDark = document.documentElement.classList.contains("dark");
      const nestedDark = Boolean(containerRef.current?.closest(".dark"));
      setIsDark(htmlDark || nestedDark);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
    };
  }, [appearance]);

  // MDXEditor treats `markdown` like defaultValue; sync external updates (e.g. Cloudinary insert).
  useEffect(() => {
    if (value === lastEmittedMarkdownRef.current) {
      return;
    }

    editorRef.current?.setMarkdown(value);
    lastEmittedMarkdownRef.current = value;
  }, [value]);

  return (
    <div className={cn("min-w-0", className)} id={id} ref={containerRef}>
      <InitializedMdxEditor
        className={cn(
          "w-full min-w-0 overflow-hidden rounded-xl border border-input bg-background [&_.mdxeditor-toolbar]:rounded-t-xl [&_.mdxeditor-toolbar]:border-b [&_.mdxeditor-toolbar]:border-border",
          isDark ? "dark-theme dark-editor" : ""
        )}
        contentEditableClassName="min-h-96 px-4 py-3 text-sm leading-relaxed outline-none"
        editorRef={editorRef}
        markdown={value}
        onChange={(markdown) => {
          lastEmittedMarkdownRef.current = markdown;
          onChange(markdown);
        }}
        placeholder="Viết nội dung bài viết bằng Markdown / MDX…"
      />
    </div>
  );
}
