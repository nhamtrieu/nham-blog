import type { MdxHeadingItem } from "@/lib/mdx-headings";
import { cn } from "@/lib/utils";

type PostTableOfContentsProps = {
  items: MdxHeadingItem[];
  className?: string;
};

export function PostTableOfContents({ items, className }: PostTableOfContentsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Muc luc trong bai"
      className={cn("rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground", className)}
    >
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Muc luc</p>
      <ol className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li
            key={`${item.href}-${index}`}
            className={cn(
              "leading-snug",
              item.depth === 3 && "pl-3",
              item.depth === 4 && "pl-5",
              item.depth === 5 && "pl-7",
              item.depth === 6 && "pl-9"
            )}
          >
            <a
              className="text-primary underline decoration-border underline-offset-2 transition hover:text-primary/90"
              href={item.href}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
