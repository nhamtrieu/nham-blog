"use client";

import { useEffect, useState } from "react";

import type { MdxHeadingItem } from "@/lib/mdx-headings";
import { cn } from "@/lib/utils";

type PostTableOfContentsProps = {
  items: MdxHeadingItem[];
  className?: string;
};

function hrefToId(href: string) {
  return href.startsWith("#") ? href.slice(1) : href;
}

function depthPaddingClass(depth: MdxHeadingItem["depth"]) {
  switch (depth) {
    case 3:
      return "pl-3";
    case 4:
      return "pl-5";
    case 5:
      return "pl-7";
    case 6:
      return "pl-9";
    default:
      return undefined;
  }
}

export function PostTableOfContents({ items, className }: PostTableOfContentsProps) {
  const [activeId, setActiveId] = useState(() =>
    items.length > 0 ? hrefToId(items[0].href) : null
  );

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    const headingElements = items
      .map((item) => document.getElementById(hrefToId(item.href)))
      .filter((element): element is HTMLElement => element !== null);

    if (headingElements.length === 0) {
      return;
    }

    const visibleIds = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleIds.add(entry.target.id);
          } else {
            visibleIds.delete(entry.target.id);
          }
        }

        // Prefer the first heading in document order that is currently visible.
        const nextActive = items
          .map((item) => hrefToId(item.href))
          .find((id) => visibleIds.has(id));

        if (nextActive) {
          setActiveId(nextActive);
          return;
        }

        // Above the fold / scrolled past all: pick nearest heading above viewport.
        let fallbackId = hrefToId(items[0].href);

        for (const element of headingElements) {
          if (element.getBoundingClientRect().top <= 96) {
            fallbackId = element.id;
          }
        }

        setActiveId(fallbackId);
      },
      {
        rootMargin: "-80px 0px -55% 0px",
        threshold: [0, 1],
      }
    );

    for (const element of headingElements) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Mục lục trong bài"
      className={cn(
        "rounded-2xl border border-border bg-muted/40 p-5 text-sm text-foreground",
        className
      )}
    >
      <p className="text-lg font-bold tracking-tight text-foreground">Mục Lục</p>
      <ol className="mt-4 space-y-2.5">
        {items.map((item, index) => {
          const id = hrefToId(item.href);
          const isActive = activeId === id;

          return (
            <li
              key={`${item.href}-${index}`}
              className={cn("leading-snug", depthPaddingClass(item.depth))}
            >
              <a
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "block transition-colors hover:text-primary",
                  isActive
                    ? "font-semibold text-primary"
                    : "font-normal text-foreground/80"
                )}
                href={item.href}
                onClick={(event) => {
                  const element = document.getElementById(id);

                  if (!element) {
                    return;
                  }

                  event.preventDefault();
                  setActiveId(id);
                  element.scrollIntoView({ behavior: "smooth", block: "start" });
                  window.history.replaceState(null, "", item.href);
                }}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
