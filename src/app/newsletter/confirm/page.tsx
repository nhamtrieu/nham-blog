import Link from "next/link";

import { newsletterService } from "@/services";
import { isServiceError } from "@/services/service-error";

type ConfirmPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function NewsletterConfirmPage({ searchParams }: ConfirmPageProps) {
  const { token } = await searchParams;
  let status: "ok" | "error" = "error";
  let detail = "Link xác nhận không hợp lệ hoặc đã hết hạn.";

  if (token?.trim()) {
    try {
      const result = await newsletterService.confirmRawToken(token);
      status = "ok";
      detail = `Đã xác nhận ${result.email}. Bạn sẽ nhận email khi có bài mới.`;
    } catch (error) {
      if (isServiceError(error)) {
        detail = error.message;
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        Newsletter
      </p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-foreground">
        {status === "ok" ? "Đăng ký thành công" : "Không xác nhận được"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{detail}</p>
      <p className="mt-8">
        <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/">
          Về trang chủ
        </Link>
      </p>
    </main>
  );
}
