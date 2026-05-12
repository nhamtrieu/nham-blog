import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { env } from "@/env";
import { siteConfig } from "@/config/site";
import { FirebaseAnalytics } from "@/components/analytics/firebase-analytics";
import { Toaster } from "@/components/ui/sonner";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={siteConfig.locale} className={roboto.variable}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster richColors />
        <FirebaseAnalytics />
      </body>
    </html>
  );
}
