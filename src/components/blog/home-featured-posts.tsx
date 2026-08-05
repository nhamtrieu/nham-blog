import Link from "next/link";

import { PostCover } from "@/components/blog/post-cover";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PostListItem } from "@/services/post.service";

type HomeFeaturedPostsProps = {
  posts: PostListItem[];
};

function FeaturedPostCard({ post }: { post: PostListItem }) {
  return (
    <article className="group">
      <Link className="block" href={`/blog/${post.slug}`}>
        <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-border/60 bg-muted">
          <PostCover coverImageUrl={post.coverImageUrl} title={post.title} />
        </div>
        <h3 className="mt-4 text-xl font-bold tracking-tight text-foreground transition group-hover:text-primary sm:text-2xl">
          {post.title}
        </h3>
        {post.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {post.excerpt}
          </p>
        ) : null}
      </Link>
    </article>
  );
}

function CompactPostCard({ post }: { post: PostListItem }) {
  return (
    <article className="group">
      <Link className="block" href={`/blog/${post.slug}`}>
        <div className="aspect-[16/10] overflow-hidden rounded-xl border border-border/60 bg-muted">
          <PostCover coverImageUrl={post.coverImageUrl} title={post.title} />
        </div>
        <h3 className="mt-3 text-sm font-semibold leading-snug text-foreground transition group-hover:text-primary sm:text-base">
          {post.title}
        </h3>
      </Link>
    </article>
  );
}

export function HomeFeaturedPosts({ posts }: HomeFeaturedPostsProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <h3 className="text-lg font-semibold text-foreground">Chưa có bài viết</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Publish bài đầu tiên từ trang admin để hiện tại đây.
        </p>
      </div>
    );
  }

  const [featuredPost, ...restPosts] = posts;
  const sidePosts = restPosts.slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10">
        <FeaturedPostCard post={featuredPost} />
        {sidePosts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {sidePosts.map((post) => (
              <CompactPostCard key={post.id} post={post} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex justify-center">
        <Link
          className={cn(
            buttonVariants({ variant: "secondary", size: "lg" }),
            "rounded-full px-8"
          )}
          href="/blog"
        >
          Xem thêm
        </Link>
      </div>
    </div>
  );
}
