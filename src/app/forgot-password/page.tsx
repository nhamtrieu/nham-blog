import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-dvh bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto flex w-full max-w-md items-center">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
