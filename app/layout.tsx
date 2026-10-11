// This app has no Next.js pages — the whole landing is
// public/invitation.html, served at `/` via a rewrite in next.config.ts.
// The layout still needs to exist for Next 15's app router to boot, and
// it's what wraps any API routes' error boundaries.

export const metadata = {
  title: "Manchester City Yas Residences — Open Days",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
