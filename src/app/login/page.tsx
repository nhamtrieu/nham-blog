import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { ReaderAuthForm } from "@/components/auth/reader-auth-form";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

function normalizeCallbackUrl(value: string | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerAuthSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const callbackUrl = normalizeCallbackUrl(resolvedSearchParams.callbackUrl);

  if (session?.user?.id) {
    redirect(callbackUrl);
  }

  return (
    <main className="flex min-h-dvh bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto flex w-full max-w-md items-center">
        <ReaderAuthForm />
      </div>
    </main>
  );
}
