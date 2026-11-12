import type { MetadataRoute } from "next";

const publicPaths = [
  "/",
  "/demos",
  "/sponsorship",
  "/referrals",
  "/accessibility",
  "/legal/privacy",
  "/legal/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({ url: new URL(path, "https://oleaconnects.com").toString() }));
}
