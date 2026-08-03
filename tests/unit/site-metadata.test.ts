import { afterEach, describe, expect, it, vi } from "vitest";

import { brandName } from "@/lib/brand";
import {
  buildSiteMetadata,
  getSiteUrl,
  siteDescription,
} from "@/lib/site-metadata";

describe("site metadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the configured public app URL when present", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.oleaconnects.com/");

    expect(getSiteUrl()).toBe("https://staging.oleaconnects.com");
  });

  it("falls back to the staging domain for share previews", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");

    expect(getSiteUrl()).toBe("https://staging.oleaconnects.com");
  });

  it("builds Open Graph and Twitter metadata for shared links", () => {
    const metadata = buildSiteMetadata("https://staging.oleaconnects.com");

    expect(metadata.metadataBase?.toString()).toBe(
      "https://staging.oleaconnects.com/",
    );
    expect(metadata.description).toBe(siteDescription);
    expect(metadata.openGraph).toMatchObject({
      siteName: brandName,
      title: `${brandName} | Governance, branded.`,
      description: siteDescription,
    });
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: "/opengraph-image",
        width: 1200,
        height: 630,
      }),
    ]);
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: `${brandName} | Governance, branded.`,
      description: siteDescription,
      images: ["/opengraph-image"],
    });
  });
});
