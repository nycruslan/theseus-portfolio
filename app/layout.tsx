import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Sofia_Sans } from "next/font/google";
import { profile } from "@/content/profile";
import { openGraph, title } from "@/lib/metadata";
import { DARK, LIGHT, SITE_URL } from "@/lib/site";
import "./globals.css";

// Every page is static content; fail the build if anything makes one render per request. Only an
// address no page was prerendered for renders on the server, to answer 404: an unknown record's
// (/log/999) reads the sprint folders to find out (app/log/[n]/page.tsx).
export const ensureStatic = "navigation";

// The text face on every route (.crew/sprint/22/notes-iris.md, section 2). The condensed display
// face is set by /, /read, /crew and /log alone (app/fonts.ts). `optional`: the face is used only if
// it is there for the first paint, so it never swaps in later and shifts the page; a fallback sized
// to its metrics holds the lines meanwhile. Not next/font's, whose one source is local Arial, which
// Android and Linux lack, but the one app/fonts.ts uses for the display face: "Sofia Sans Local" in
// app/globals.css carries next/font's metrics over Arial and its metric twins
// (.crew/sprint/41/contract.md, P16). Under Turbopack a `fallback` list replaces next/font's sized
// fallback rather than following it, hence `adjustFontFallback: false` with it; app/globals.css
// adds the generic family.
const sofiaSans = Sofia_Sans({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-sofia",
  adjustFontFallback: false,
  fallback: ["Sofia Sans Local"],
});

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sofiaSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        {/* Its script is served by Vercel alone, so anywhere else it would only log a 404. */}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
