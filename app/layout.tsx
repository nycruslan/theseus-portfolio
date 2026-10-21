import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { profile } from "@/content/profile";
import { openGraph, title } from "@/lib/metadata";
import { DARK, LIGHT, SITE_URL } from "@/lib/site";
import "./globals.css";

// The whole site is static content; fail the build if anything makes it render per request.
export const ensureStatic = "navigation";

// The text face, on every route (sprint 16). next/font self-hosts the file from app/fonts (its
// licence beside it), preloads it, and writes the @font-face for the latin subset, which is the
// whole of what the owner's words use. The family is named here and used by name in app/globals.css,
// with its metric-fitted fallback, so the constant itself is never read. The fallback is written
// there too: next/font would name it after the constant, and the constant can't hold a space.
const _libreFranklin = localFont({
  src: "./fonts/libre-franklin-400-700-latin.woff2",
  weight: "400 700",
  adjustFontFallback: false,
  declarations: [{ prop: "font-family", value: "Libre Franklin" }],
});

// Every route gets these. The social image comes from app/opengraph-image.tsx and the icon from
// app/icon.svg; Next adds their tags itself. A canonical URL and og:url belong to one page each, so
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
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
