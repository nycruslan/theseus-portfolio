import { type NextRequest, NextResponse } from "next/server";
import { addressOf, drawnFor, HOME, keyOf, parseWindow } from "@/lib/trials";

// The trials' addresses (.crew/sprint/63/contract.md, "The addresses"), answered before any page
// renders: /trials/1440x900 is /trials (308); a window in the grid's range that the sweep doesn't
// hold answers 307 to its grid window; anything else is the site's 404. Here, not in the window
// page, for two reasons Next 16.4 gives: a page's redirect() on a window's first request sends its
// Location header twice, and a page's notFound() is an empty shell without script
// (app/log/[n]/page.tsx). A swept window passes through to its prerendered or cached page.

/** An address no route matches, so the server draws the site's 404 page itself. */
const NOT_FOUND = "/not-a-trials-window";

export function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.slice("/trials/".length);
  const asked = parseWindow(segment);
  const drawn = asked && drawnFor(asked);
  const to = (path: string) => new URL(path, request.url);
  if (!asked || !drawn) return NextResponse.rewrite(to(NOT_FOUND));
  if (keyOf(asked) === keyOf(HOME))
    return NextResponse.redirect(to(addressOf(HOME)), 308);
  if (keyOf(drawn) !== keyOf(asked))
    return NextResponse.redirect(to(addressOf(drawn)), 307);
  return NextResponse.next();
}

export const config = {
  // One segment under /trials, never the frame's address or the form's.
  matcher: "/trials/:window((?!frame$|go$)[^/]+)",
};
