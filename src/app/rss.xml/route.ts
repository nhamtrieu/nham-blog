import { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { env } from "@/env";
import { absoluteUrl } from "@/lib/absolute-url";
import { escapeXml } from "@/lib/xml-escape";
import { postService } from "@/services";

function formatRfc822(date: Date) {
  return date.toUTCString();
}

export async function GET() {
  const items = await postService.listPublishedPostsForRss({ limit: 30 });
  const siteTitle = escapeXml(env.NEXT_PUBLIC_SITE_NAME);
  const siteLink = escapeXml(absoluteUrl("/"));
  const channelDescription = escapeXml(siteConfig.description.slice(0, 500));

  const itemXml = items
    .map((post) => {
      const link = absoluteUrl(`/blog/${post.slug}`);
      const description = escapeXml(post.excerpt?.trim() || post.title);
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${formatRfc822(post.publishedAt)}</pubDate>
      <description>${description}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${siteTitle}</title>
    <link>${siteLink}</link>
    <description>${channelDescription}</description>
    <language>${siteConfig.locale}</language>
    <lastBuildDate>${formatRfc822(new Date())}</lastBuildDate>
${itemXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
