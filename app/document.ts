import { Sofia_Sans } from "next/font/google";

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

// The document's root and body as every page has them. Two roots render them: the App Router's
// layout (app/layout.tsx) and the Pages Router's document (pages/_document.tsx), which serves only
// the trials' frame (pages/trials/frame.tsx). Both read them from here, so the frame's document
// can't drift from /'s.
export const htmlAttributes = {
  lang: "en",
  className: `${sofiaSans.variable} h-full antialiased`,
};

export const bodyAttributes = {
  className: "flex min-h-full flex-col font-sans",
};
