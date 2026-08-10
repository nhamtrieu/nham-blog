import type { Metadata } from "next";
import { Roboto } from "next/font/google";

import { getServerAuthSession } from "@/auth";
import { FirebaseAnalytics } from "@/components/analytics/firebase-analytics";
import { PublicHeader } from "@/components/public/public-header";
import { PublicSiteShell } from "@/components/public/public-site-shell";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import { env } from "@/env";
import { isAuthenticatedSession } from "@/lib/auth/authorization";

import "./globals.css";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  metadataBase: new URL(env.APP_URL),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerAuthSession();
  const verificationUser = isAuthenticatedSession(session)
    ? {
      email: session.user.email,
      role: session.user.role,
      emailVerified: session.user.emailVerified,
      createdAt: session.user.createdAt,
    }
    : null;

  return (
    <html lang={siteConfig.locale} className={roboto.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("nham-theme")==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <AuthSessionProvider>
          <PublicSiteShell header={<PublicHeader />} verificationUser={verificationUser}>
            {children}
          </PublicSiteShell>
          <Toaster richColors />
          <FirebaseAnalytics />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
