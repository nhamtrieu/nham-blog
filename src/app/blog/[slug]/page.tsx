import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { ComponentPropsWithoutRef } from "react";

import { getServerAuthSession } from "@/auth";
import { CommentSection, type PublicCommentView } from "@/components/blog/comment-section";
import { PostShareLinks } from "@/components/blog/post-share-links";
import { PostTableOfContents } from "@/components/blog/post-table-of-contents";
import { loadPublishedPostBySlug } from "@/app/blog/[slug]/load-published-post";
import { env } from "@/env";
import { absoluteUrl } from "@/lib/absolute-url";
import { extractMdxHeadings } from "@/lib/mdx-headings";
import { cn } from "@/lib/utils";
import { SERVICE_ERROR_CODES, commentService, isServiceError } from "@/services";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function trimMetaDescription(value: string, max = 200) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const post = await loadPublishedPostBySlug(slug);
    const title = post.seoTitle?.trim() || post.title;
    const rawDescription =
      post.seoDescription?.trim() ||
      post.excerpt?.trim() ||
      `${post.title} — ${env.NEXT_PUBLIC_SITE_NAME}`;
    const description = trimMetaDescription(rawDescription);
    const canonical = absoluteUrl(`/blog/${post.slug}`);
    const cover = post.coverImageUrl?.trim() || null;

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        type: "article",
        url: canonical,
        siteName: env.NEXT_PUBLIC_SITE_NAME,
        title,
        description,
        publishedTime: post.publishedAt?.toISOString(),
        modifiedTime: post.updatedAt.toISOString(),
        locale: "vi_VN",
        ...(cover
          ? {
            images: [
              {
                url: cover,
                alt: post.title,
              },
            ],
          }
          : {}),
        tags: post.tags.map((tag) => tag.name),
      },
      twitter: {
        card: cover ? "summary_large_image" : "summary",
        title,
        description,
        ...(cover ? { images: [cover] } : {}),
      },
    };
  } catch (error) {
    if (isServiceError(error) && error.code === SERVICE_ERROR_CODES.NOT_FOUND) {
      notFound();
    }

    throw error;
  }
}

function formatPublishedDate(value: Date | null) {
  if (!value) {
    return "Chua co ngay publish";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

const headingScrollClass = "scroll-mt-24";

function MdxH1(props: ComponentPropsWithoutRef<"h1">) {
  return (
    <h1
      className={cn("mt-10 text-3xl font-semibold tracking-tight text-foreground", headingScrollClass)}
      {...props}
    />
  );
}

function MdxH2(props: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className={cn("mt-9 text-2xl font-semibold tracking-tight text-foreground", headingScrollClass)}
      {...props}
    />
  );
}

function MdxH3(props: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3 className={cn("mt-8 text-xl font-semibold text-foreground", headingScrollClass)} {...props} />
  );
}

function MdxH4(props: ComponentPropsWithoutRef<"h4">) {
  return (
    <h4 className={cn("mt-7 text-lg font-semibold text-foreground", headingScrollClass)} {...props} />
  );
}

function MdxH5(props: ComponentPropsWithoutRef<"h5">) {
  return (
    <h5 className={cn("mt-6 text-base font-semibold text-foreground", headingScrollClass)} {...props} />
  );
}

function MdxH6(props: ComponentPropsWithoutRef<"h6">) {
  return (
    <h6 className={cn("mt-6 text-sm font-semibold text-foreground", headingScrollClass)} {...props} />
  );
}

function MdxParagraph(props: ComponentPropsWithoutRef<"p">) {
  return <p className="mt-5 text-base leading-8 text-foreground/85" {...props} />;
}

function MdxAnchor({ className, ...props }: ComponentPropsWithoutRef<"a">) {
  return (
    <a
      className={cn(
        "font-medium text-primary underline decoration-primary/40 underline-offset-4 transition hover:text-primary/90",
        className
      )}
      {...props}
    />
  );
}

function MdxBlockquote(props: ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote
      className="mt-6 border-l-4 border-primary/40 bg-primary/5 px-4 py-3 text-foreground/85 italic"
      {...props}
    />
  );
}

function MdxPre(props: ComponentPropsWithoutRef<"pre">) {
  return (
    <pre
      className="mt-6 overflow-x-auto rounded-2xl border border-border bg-muted p-4 text-sm leading-7 text-foreground"
      {...props}
    />
  );
}

function MdxCode({ className, ...props }: ComponentPropsWithoutRef<"code">) {
  return (
    <code
      className={cn(
        "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground",
        className
      )}
      {...props}
    />
  );
}

function MdxList(props: ComponentPropsWithoutRef<"ul">) {
  return <ul className="mt-5 list-disc space-y-2 pl-6 text-base leading-8 text-foreground/85" {...props} />;
}

function MdxOrderedList(props: ComponentPropsWithoutRef<"ol">) {
  return <ol className="mt-5 list-decimal space-y-2 pl-6 text-base leading-8 text-foreground/85" {...props} />;
}

function MdxImage({ alt, ...props }: ComponentPropsWithoutRef<"img">) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt ?? ""}
      className="mt-6 w-full rounded-2xl border border-border bg-muted object-cover"
      loading="lazy"
      {...props}
    />
  );
}

const mdxComponents = {
  a: MdxAnchor,
  blockquote: MdxBlockquote,
  code: MdxCode,
  h1: MdxH1,
  h2: MdxH2,
  h3: MdxH3,
  h4: MdxH4,
  h5: MdxH5,
  h6: MdxH6,
  img: MdxImage,
  ol: MdxOrderedList,
  p: MdxParagraph,
  pre: MdxPre,
  ul: MdxList,
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const pageData = await (async () => {
    try {
      const post = await loadPublishedPostBySlug(slug);
      const { content } = await compileMDX({
        source: post.contentMdx,
        components: mdxComponents,
        options: {
          blockDangerousJS: true,
          blockJS: true,
          mdxOptions: {
            rehypePlugins: [rehypeSlug, rehypeSanitize],
            remarkPlugins: [remarkGfm],
          },
        },
      });

      const tocItems = extractMdxHeadings(post.contentMdx);

      return {
        content,
        post,
        tocItems,
      };
    } catch (error) {
      if (isServiceError(error) && error.code === SERVICE_ERROR_CODES.NOT_FOUND) {
        notFound();
      }

      throw error;
    }
  })();
  const { post, content, tocItems } = pageData;
  const postUrl = absoluteUrl(`/blog/${post.slug}`);
  const [initialComments, session] = await Promise.all([
    commentService.listApprovedCommentsForPostSlug({ slug: post.slug }),
    getServerAuthSession(),
  ]);
  const commentViews: PublicCommentView[] = initialComments.items.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author,
  }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        href="/"
      >
        Về trang chủ
      </Link>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <article
          className={cn(
            "order-2 min-w-0 flex-1 rounded-[2rem] border border-border bg-card px-5 py-6 shadow-sm sm:px-8 sm:py-10 lg:order-1",
            tocItems.length > 0 && "lg:max-w-3xl"
          )}
        >
          <header>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-primary uppercase">
                Published
              </span>
              <span className="text-xs text-muted-foreground">{formatPublishedDate(post.publishedAt)}</span>
              <span className="text-xs text-muted-foreground">{post.readingTime} phút đọc</span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {post.title}
            </h1>
            {post.excerpt ? (
              <p className="mt-4 text-base leading-8 text-muted-foreground sm:text-lg">{post.excerpt}</p>
            ) : null}

            {post.tags.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                    href={`/tags/${tag.slug}`}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            ) : null}

            <PostShareLinks className="mt-6" title={post.title} url={postUrl} />
          </header>

          {post.coverImageUrl ? (
            <figure className="mt-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={post.title}
                className="aspect-video w-full rounded-[1.4rem] border border-border bg-muted object-cover"
                src={post.coverImageUrl}
              />
            </figure>
          ) : null}

          <div className="mt-8 border-t border-border pt-6">{content}</div>

          <CommentSection
            currentUser={
              session?.user?.id
                ? {
                  id: session.user.id,
                  name: session.user.name,
                }
                : null
            }
            initialComments={commentViews}
            loginHref={`/login?callbackUrl=${encodeURIComponent(`/blog/${post.slug}`)}`}
            slug={post.slug}
          />
        </article>

        {tocItems.length > 0 ? (
          <aside className="order-1 w-full shrink-0 lg:order-2 lg:sticky lg:top-24 lg:w-72 lg:self-start">
            <PostTableOfContents
              className="lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
              items={tocItems}
            />
          </aside>
        ) : null}
      </div>
    </main>
  );
}
