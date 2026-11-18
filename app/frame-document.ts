import { Sofia_Sans } from "next/font/google";

// The trials' frame's document (pages/_document.tsx, pages/trials/frame.tsx): its root and body as
// app/layout.tsx gives every App Router page, so the frame's document is /'s. Keep the two in step.
// They can't share one module: next/font names a face's class after the module that loads it, so
// loading the layout's face from here would rename it on every page, and the layout can't be
// imported by the Pages Router, which takes global CSS from its app alone.

// The text face, with the layout's options word for word (next/font takes them only as literals;
// app/layout.tsx says why each).
const sofiaSans = Sofia_Sans({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-sofia",
  adjustFontFallback: false,
  fallback: ["Sofia Sans Local"],
});

export const htmlAttributes = {
  lang: "en",
  className: `${sofiaSans.variable} h-full antialiased`,
};

export const bodyAttributes = {
  className: "flex min-h-full flex-col font-sans",
};
