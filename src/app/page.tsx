import { HomeFeaturedPosts } from "@/components/blog/home-featured-posts";
import { HomeHeroBanner, HomePostsHeading } from "@/components/blog/home-hero-banner";
import { siteConfig } from "@/config/site";
import { postService } from "@/services";

export default async function HomePage() {
  const publishedPosts = await postService.listPublishedPosts({
    limit: 5,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <HomeHeroBanner />

      <section className="mt-12 space-y-6" id="posts">
        <HomePostsHeading siteName={siteConfig.name} />
        <HomeFeaturedPosts posts={publishedPosts.items} />
      </section>
    </main>
  );
}
