import type { NextConfig } from "next";

// Static export is for Dokploy/nginx builds only. In `next dev`, keep dynamic
// routes enabled so /qr/<siteSlug>/ works without pre-listing every site.
const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
