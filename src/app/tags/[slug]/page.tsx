import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { loadTagBySlug } from "@/app/tags/[slug]/load-tag";
import { PublishedPostFeed } from "@/components/blog/published-post-feed";
import { env } from "@/env";
import { absoluteUrl } from "@/lib/absolute-url";
import { SERVICE_ERROR_CODES, isServiceError, postService } from "@/services";
import type { TagListItem } from "@/services/tag.service";

type TagPageProps = {
  params: Promise<{
    slug: string;
  }>;
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

function trimMetaDescription(value: string, max = 200) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const tag = await loadTagBySlug(slug);
    const title = `${tag.name} | ${env.NEXT_PUBLIC_SITE_NAME}`;
    const description = trimMetaDescription(
      `Cac bai viet da publish gan tag "${tag.name}" tren ${env.NEXT_PUBLIC_SITE_NAME}.`
    );
    const canonical = absoluteUrl(`/tags/${tag.slug}`);

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        type: "website",
        url: canonical,
        siteName: env.NEXT_PUBLIC_SITE_NAME,
        title,
        description,
        locale: "vi_VN",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch (error) {
    if (isServiceError(error) && error.code === SERVICE_ERROR_CODES.NOT_FOUND) {
      notFound();
    }

    throw error;
  }
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug: rawSlug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const cursor = resolveCursorParam(resolvedSearchParams.cursor)?.trim();

  let tag: TagListItem;
  try {
    tag = await loadTagBySlug(rawSlug);
  } catch (error) {
    if (isServiceError(error) && error.code === SERVICE_ERROR_CODES.NOT_FOUND) {
      notFound();
    }

    throw error;
  }

  const publishedPosts = await postService.listPublishedPostsForTag({
    tagId: tag.id,
    cursor,
    limit: 6,
  });
  const hasActiveCursor = Boolean(cursor);
  const basePath = `/tags/${tag.slug}`;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
        href="/"
      >
        Ve trang chu
      </Link>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_45%,#ecfeff_100%)] p-7 shadow-[0_30px_90px_-60px_rgba(14,45,74,0.35)] sm:p-10">
        <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-cyan-700 uppercase">
          Tag
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{tag.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          Cac bai viet da publish gan tag nay, sap xep theo ngay publish. Phan trang dung cursor giong trang chu.
        </p>
      </section>

      <PublishedPostFeed
        basePath={basePath}
        emptyState={{
          title: "Chua co bai viet voi tag nay",
          description:
            "Khi co bai da publish duoc gan tag nay, danh sach se hien thi tai day. Ban co the xem cac tag khac tu trang chu.",
        }}
        hasActiveCursor={hasActiveCursor}
        items={publishedPosts.items}
        nextCursor={publishedPosts.pageInfo.nextCursor}
      />
    </main>
  );
}
