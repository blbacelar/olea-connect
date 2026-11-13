/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/modules/board-calendar": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/templates/[slug]": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/templates/board-self-evaluation": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/ed-review/annual/export": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/strategic-planning/export": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/strategic-planning/survey/export": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/strategic-planning/survey/results/export": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/strategic-planning/workbook/print": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  serverExternalPackages: ["@sparticuz/chromium"],
  reactStrictMode: true,
};

export default nextConfig;
