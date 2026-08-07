import Link from "next/link";
import { Check, FileText } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const HERO_POINTS = [
  "Ghi chú kỹ thuật thực chiến",
  "Bài viết ngắn gọn, dễ đọc",
  "Bình luận sau khi đăng nhập",
  "Cập nhật đều đặn từ trải nghiệm làm việc",
] as const;

export function HomeHeroBanner() {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-primary/10 px-6 py-8 sm:px-10 sm:py-10">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div>
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            {siteConfig.name}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Viết về engineering
            <span className="block text-foreground/80">một cách rõ ràng</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Nhật ký kỹ thuật, pattern thực dụng và những ghi chú mình muốn giữ lại khi làm sản phẩm.
          </p>
          <ul className="mt-6 space-y-2.5">
            {HERO_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-foreground/85 sm:text-base">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-start gap-5 lg:items-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={siteConfig.name}
            className="size-20 sm:size-24"
            height={96}
            src="/logo.png"
            width={96}
          />
          <Link
            className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6 shadow-sm")}
            href="#posts"
          >
            Xem bài viết
          </Link>
        </div>
      </div>
    </section>
  );
}

type HomePostsHeadingProps = {
  siteName: string;
};

export function HomePostsHeading({ siteName }: HomePostsHeadingProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="size-4" />
      </span>
      <h2 className="text-xl font-bold text-primary sm:text-2xl">{siteName} Posts</h2>
    </div>
  );
}
