import type { NextConfig } from "next";

// Optional basePath — set NEXT_PUBLIC_BASE_PATH=/yas_residences_rsvp in prod so
// the app is served under that prefix, matching the parent site's proxy rewrite
// (blackoak-re.com/yas_residences_rsvp → mancityrsvp.vercel.app/yas_residences_rsvp/*).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// The parent site excludes this path from its own CSP, so the app ships its
// own. The page JS lives in public/app.js so no inline scripts are needed.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'none'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The parent site (blackoak-website) redirects every path to a trailing
  // slash before proxying. Match that here so /api/* does not bounce back
  // and forth between the two hosts (308 loop).
  trailingSlash: true,
  ...(basePath ? { basePath } : {}),
  async rewrites() {
    return {
      // Serve the static invitation at the app root (basePath is prepended
      // automatically by Next, so do not include it in `source`).
      beforeFiles: [{ source: "/", destination: "/invitation.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
