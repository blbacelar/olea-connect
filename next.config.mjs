/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/modules/board-calendar": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/templates/[slug]": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/templates/board-self-evaluation": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  serverExternalPackages: ["@sparticuz/chromium"],
  reactStrictMode: true,
};

export default nextConfig;
