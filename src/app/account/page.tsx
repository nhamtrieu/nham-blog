import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { isAuthenticatedSession } from "@/lib/auth/authorization";
import { accountProfileService } from "@/services/account-profile.service";

export default async function AccountPage() {
  const session = await getServerAuthSession();

  if (!isAuthenticatedSession(session)) {
    redirect("/login?callbackUrl=/account");
  }

  const profile = await accountProfileService.getProfile(session.user.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <AccountProfileForm initialProfile={profile} />
    </main>
  );
}
