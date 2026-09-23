import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "katex/dist/katex.min.css";

import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { resolveRootAuthState } from "@/lib/auth/root-auth-state";
import { indexRobots, siteConfig } from "@/lib/site-config";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),

  title: {
    default: siteConfig.defaultTitle,
    template: "%s | PrepDMAT",
  },

  description: siteConfig.description,

  applicationName: siteConfig.name,

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: siteConfig.name,
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
  },

  twitter: {
    card: "summary",
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
  },

  robots: indexRobots,

  category: "education",
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
          <div className="relative flex min-h-screen flex-col bg-background" data-app-frame>
            <SiteHeader diagnosticStatus={authState.diagnosticStatus} initialAccount={authState.account} />
            <main className="min-h-0 flex-1" data-site-main>{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
