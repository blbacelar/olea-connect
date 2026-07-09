/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium"],
  },
  reactStrictMode: true,
};

export default nextConfig;
