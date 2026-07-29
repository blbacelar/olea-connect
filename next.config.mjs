/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/modules/board-calendar": ["./node_modules/@sparticuz/chromium/bin/**/*"],
      "/templates/[slug]": ["./node_modules/@sparticuz/chromium/bin/**/*"],
      "/templates/board-self-evaluation": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    },
    serverComponentsExternalPackages: ["@sparticuz/chromium"],
  },
  reactStrictMode: true,
};

export default nextConfig;
