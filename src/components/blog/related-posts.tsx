import { BlogPostCard } from "@/components/blog/blog-post-grid";
import type { PostListItem } from "@/services/post.service";

type RelatedPostsProps = {
  posts: PostListItem[];
};

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="related-posts-heading" className="mt-10 border-t border-border pt-8">
      <h2
        className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
        id="related-posts-heading"
      >
        Bài viết liên quan
      </h2>
      <div className="mt-5 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogPostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
