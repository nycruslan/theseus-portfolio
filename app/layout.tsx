import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { profile } from "@/content/profile";
import { DARK, LIGHT, SITE_URL } from "@/lib/site";
import "./globals.css";

// The whole site is static content; fail the build if anything makes it render per request.
export const ensureStatic = "navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const title = `${profile.name} — ${profile.headline}`;

// The social image comes from app/opengraph-image.tsx and the icon from app/icon.svg; Next adds
// their tags itself.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description: profile.bio,
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    url: "/",
    title,
    description: profile.bio,
    siteName: profile.name,
    locale: "en_US",
  },
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
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
