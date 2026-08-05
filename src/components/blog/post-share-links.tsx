import { CopyLinkButton } from "@/components/blog/copy-link-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PostShareLinksProps = {
  url: string;
  title: string;
  className?: string;
};

function shareHref(kind: "twitter" | "facebook" | "linkedin", url: string, title: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  if (kind === "twitter") {
    return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  }

  if (kind === "facebook") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }

  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
}

export function PostShareLinks({ url, title, className }: PostShareLinksProps) {
  const chip = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "h-8 rounded-full border-input px-3 text-xs font-medium"
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-medium text-muted-foreground">Chia sẻ:</span>
      <a className={chip} href={shareHref("twitter", url, title)} rel="noopener noreferrer" target="_blank">
        X / Twitter
      </a>
      <a className={chip} href={shareHref("facebook", url, title)} rel="noopener noreferrer" target="_blank">
        Facebook
      </a>
      <a className={chip} href={shareHref("linkedin", url, title)} rel="noopener noreferrer" target="_blank">
        LinkedIn
      </a>
      <CopyLinkButton className="h-8 rounded-full px-3 text-xs" url={url} />
    </div>
  );
}
