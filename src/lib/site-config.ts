import type { Metadata } from "next";

export const siteConfig = {
  name: "PrepDMAT",
  url: "https://prepdmat.in",
  defaultTitle: "dMAT Preparation & Mock Tests | PrepDMAT",
  description:
    "Prepare for the dMAT Core Module with practice questions, a free diagnostic and mock tests for Figure Sequences, Mathematical Equations and Latin Squares.",
} as const;

export function siteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteUrl("/"),
} as const;

export const indexRobots: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

