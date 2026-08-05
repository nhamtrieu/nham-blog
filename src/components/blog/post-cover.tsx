import { cn } from "@/lib/utils";

type PostCoverProps = {
  coverImageUrl: string | null;
  title: string;
  className?: string;
};

export function PostCover({ coverImageUrl, title, className }: PostCoverProps) {
  if (coverImageUrl) {
    return (
      // ponytail: remote covers come from Cloudinary/arbitrary hosts; <img> avoids next/image config sprawl
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className={cn(
          "h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]",
          className
        )}
        src={coverImageUrl}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "flex h-full w-full items-end bg-gradient-to-br from-emerald-100 via-violet-100 to-sky-100 p-4",
        className
      )}
    >
      <span className="line-clamp-3 text-lg font-semibold text-foreground/70">{title}</span>
    </div>
  );
}
