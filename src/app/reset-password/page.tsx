import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const token = resolvedSearchParams.token?.trim() || null;

  return (
    <main className="flex min-h-dvh bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto flex w-full max-w-md items-center">
        <ResetPasswordForm token={token} />
      </div>
    </main>
  );
}
