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

  title: {
    default: "PrepDMAT | dMAT Preparation, Practice & Mock Tests",
    template: "%s | PrepDMAT",
  },

  description:
    "Prepare for the dMAT with realistic Core practice, timed mock tests, diagnostics, explanations, and performance analytics. Independent dMAT preparation by PrepDMAT.",

  applicationName: "PrepDMAT",

  keywords: [
    "dMAT preparation",
    "dMAT prep",
    "dMAT practice",
    "dMAT mock test",
    "dMAT exam",
    "dMAT Core Module",
    "dMAT Figure Sequences",
    "dMAT Mathematical Equations",
    "dMAT Latin Squares",
    "digital Master Test preparation",
    "PrepDMAT",
  ],

  authors: [{ name: "PrepDMAT" }],
  creator: "PrepDMAT",
  publisher: "PrepDMAT",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "PrepDMAT",
    title: "PrepDMAT | Prepare for the dMAT with clarity",
    description:
      "Realistic dMAT practice, timed mock tests, diagnostics, explanations, and performance analytics.",
    images: [
      {
        url: "/branding/social/prepdmat-og.png",
        width: 1200,
        height: 630,
        alt: "PrepDMAT - Prepare with clarity",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "PrepDMAT | Prepare for the dMAT with clarity",
    description:
      "Realistic dMAT practice, mock tests, diagnostics, explanations, and performance analytics.",
    images: ["/branding/social/prepdmat-og.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

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
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
