import { PublishedPostFeed } from "@/components/blog/published-post-feed";
import { postService } from "@/services";

type HomePageProps = {
  searchParams?: Promise<{
    cursor?: string | string[];
  }>;
};

function resolveCursorParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const cursor = resolveCursorParam(resolvedSearchParams.cursor)?.trim();
  const publishedPosts = await postService.listPublishedPosts({
    cursor,
    limit: 6,
  });
  const hasActiveCursor = Boolean(cursor);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="rounded-2xl border border-border bg-card p-7 shadow-lg sm:p-10">
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
          Nham Blog
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Bài viết mới nhất
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          Trang này chỉ hiển thị bài đã publish.
        </p>
      </section>

      <PublishedPostFeed
        basePath="/"
        emptyState={{
          title: "Chưa có bài viết đã publish",
          description: "Bài draft sẽ không hiển thị tại đây. Vui lòng publish bài đầu tiên từ trang admin.",
        }}
        hasActiveCursor={hasActiveCursor}
        items={publishedPosts.items}
        nextCursor={publishedPosts.pageInfo.nextCursor}
      />
    </main>
  );
}
