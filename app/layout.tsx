import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { bodyAttributes, htmlAttributes } from "@/app/document";
import { profile } from "@/content/profile";
import { openGraph, title } from "@/lib/metadata";
import { DARK, LIGHT, SITE_URL } from "@/lib/site";
import "./globals.css";

// Every page is static content; fail the build if anything makes one render per request. Only an
// address no page was prerendered for renders on the server, to answer 404: an unknown record's
// (/log/999) reads the sprint folders to find out (app/log/[n]/page.tsx).
export const ensureStatic = "navigation";

// Every route gets these, unless it sets its own `openGraph` or `twitter`: those replace the objects
// below whole, and with them the social image from app/opengraph-image.tsx, so such a route needs an
// opengraph-image of its own (app/log/opengraph-image.tsx). The icon comes from app/icon.svg; Next
// adds the image and icon tags itself. A canonical URL and og:url belong to one page each, so
// they're set by the page (app/page.tsx), never here: here they would make every route, a 404
// included, claim to be the home page.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description: profile.bio,
  openGraph,
  twitter: { card: "summary_large_image", title, description: profile.bio },
};

// Meta tags can't read CSS variables, so the two address-bar colors come from lib/site.ts, which
// repeats each scheme's --background.
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: LIGHT.background },
    { media: "(prefers-color-scheme: dark)", color: DARK.background },
  ],
};

// The root and body come from app/document.ts, which the trials' frame's document shares.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html {...htmlAttributes}>
      <body {...bodyAttributes}>
        {children}
        {/* Its script is served by Vercel alone, so anywhere else it would only log a 404. */}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
