import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Frontend-only phase: every page reads the mock database from the browser (IndexedDB), so pages
    // render client-side after a splash screen and cannot be "instant" from the server. Validate only
    // segments that opt in explicitly. Revisit when the real backend lands.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
