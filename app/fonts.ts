import { Sofia_Sans_Extra_Condensed } from "next/font/google";

// The display face: the names, the wordmark and the section heads. Declared once here and imported
// by the routes that set it (/, /read and /crew), never by the layout or the 404, so only they
// preload it and /sprints stays one family (.crew/sprint/22/contract.md, B1.10; app/not-found.tsx
// says why the 404 takes the text face). `optional` draws with the face only if it is there for the
// first paint, so it never swaps in later and moves the page (B1.8). Meanwhile the fallback holds
// the same lines: not next/font's, whose one source, local Arial, a phone without Arial (Android,
// Linux) doesn't have, so the page fell to the generic sans at full size, the wordmark 35 px wider
// and the bar overflowing at 320 (.crew/sprint/27/notes-iris.md, section 8). The face in
// app/globals.css ("The display face's fallback") carries next/font's metrics over Arial and its
// metric twins, Liberation Sans and Arimo.
export const sofiaCondensed = Sofia_Sans_Extra_Condensed({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-sofia-cond",
  adjustFontFallback: false,
  fallback: ["Sofia Sans Extra Condensed Local"],
});
