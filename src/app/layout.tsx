import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { resolveRootAuthState } from "@/lib/auth/root-auth-state";
import { getEnv } from "@/lib/validators/env";

import "./globals.css";

const env = getEnv();

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "dMAT Prep",
  description:
    "Independent preparation platform for realistic dMAT Core practice, mock tests, and performance analytics.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authState = await resolveRootAuthState();

  return (
    <html
      lang="en"
      className="h-full scroll-smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground antialiased">
        <ThemeProvider defaultTheme={authState.theme}>
          <div className="relative flex min-h-screen flex-col bg-background">
            <SiteHeader initialAccount={authState.account} />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
