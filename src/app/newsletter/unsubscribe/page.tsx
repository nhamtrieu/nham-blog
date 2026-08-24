import Link from "next/link";

import { NewsletterUnsubscribeForm } from "@/components/newsletter/newsletter-unsubscribe-form";
import { newsletterService } from "@/services";

type UnsubscribePageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function NewsletterUnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;
  const peek = token?.trim()
    ? await newsletterService.peekUnsubscribeToken(token)
    : null;

  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        Newsletter
      </p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-foreground">
        Hủy đăng ký
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {peek
          ? `Bạn sắp hủy nhận newsletter cho ${peek.email}.`
          : "Link hủy đăng ký không hợp lệ. Nếu bạn vẫn nhận email, hãy dùng link trong email mới nhất."}
      </p>

      {peek && token ? (
        <div className="mt-8">
          <NewsletterUnsubscribeForm token={token} />
        </div>
      ) : null}

      <p className="mt-8">
        <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/">
          Về trang chủ
        </Link>
      </p>
    </main>
  );
}
