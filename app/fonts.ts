import { Sofia_Sans_Extra_Condensed } from "next/font/google";

// The display face: the names, the wordmark and the section heads. Declared once here and imported
// by the routes that set it (/, /read and the 404), never by the layout, so only those routes
// preload it and /sprints stays one family (.crew/sprint/22/contract.md, B1.10). `optional` draws
// with the face only if it is there for the first paint, so it never swaps in later and moves the
// page (B1.8); the fallback next/font fits to its metrics holds the same lines meanwhile (see
// app/layout.tsx on why there is no `fallback` list). Each route puts `.variable` on the elements
// that use the face.
export const sofiaCondensed = Sofia_Sans_Extra_Condensed({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-sofia-cond",
});
