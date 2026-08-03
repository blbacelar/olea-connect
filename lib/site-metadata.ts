import type { Metadata } from "next";

import { brandName } from "@/lib/brand";

const fallbackSiteUrl = "https://staging.oleaconnects.com";

export const siteTitle = brandName;
export const siteDescription =
  "Board-ready governance templates, webinars, grants, and community support for Canadian nonprofits.";

export function getSiteUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    formatVercelHost(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    formatVercelHost(process.env.VERCEL_URL) ||
    fallbackSiteUrl;

  return normalizeUrl(url);
}

export function buildSiteMetadata(siteUrl = getSiteUrl()): Metadata {
  const metadataBase = new URL(siteUrl);
  const socialImage = "/opengraph-image";

  return {
    metadataBase,
    title: {
      default: `${siteTitle} | Governance, branded.`,
      template: `%s | ${siteTitle}`,
    },
    description: siteDescription,
    applicationName: siteTitle,
    authors: [{ name: "Olive Social Impact" }],
    creator: "Olive Social Impact",
    publisher: "Olive Social Impact",
    keywords: [
      "nonprofit governance",
      "board templates",
      "Canadian nonprofits",
      "nonprofit board documents",
      "governance tools",
      brandName,
    ],
    alternates: {
      canonical: "/",
    },
    icons: {
      icon: "/olea-tree.png",
      apple: "/olea-tree.png",
    },
    openGraph: {
      type: "website",
      locale: "en_CA",
      siteName: siteTitle,
      url: "/",
      title: `${siteTitle} | Governance, branded.`,
      description: siteDescription,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: "Olea Connects™ governance platform for Canadian nonprofits",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteTitle} | Governance, branded.`,
      description: siteDescription,
      images: [socialImage],
    },
  };
}

function formatVercelHost(host: string | undefined) {
  if (!host) return "";
  return host.startsWith("http") ? host : `https://${host}`;
}

function normalizeUrl(url: string) {
  const withProtocol = url.startsWith("http") ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, "");
}
