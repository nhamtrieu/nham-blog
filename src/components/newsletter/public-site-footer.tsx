import Link from "next/link";

import { NewsletterSubscribeForm } from "@/components/newsletter/newsletter-subscribe-form";
import { siteConfig } from "@/config/site";

export function PublicSiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-2">
          <p className="font-serif text-xl font-semibold tracking-tight text-foreground">
            {siteConfig.name}
          </p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {siteConfig.description}
          </p>
          <p className="pt-2 text-xs text-muted-foreground">
            <Link className="underline-offset-4 hover:underline" href="/blog">
              Blog
            </Link>
            {" · "}
            <Link className="underline-offset-4 hover:underline" href="/rss.xml">
              RSS
            </Link>
          </p>
        </div>

        <NewsletterSubscribeForm source="footer" />
      </div>
    </footer>
  );
}
