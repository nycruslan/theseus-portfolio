import type { Metadata } from "next";
import { SkipLink } from "@/components/skip-link";
import { profile } from "@/content/profile";

// Not the home page's title, so a tab or a history entry says what happened. Next adds
// `robots: noindex` itself, and no canonical or og:url is set here (app/layout.tsx).
export const metadata: Metadata = {
  title: `Page not found — ${profile.name}`,
};

// A mistyped address gets a page in the site's own style with one decision: go back
// (.crew/sprint/23/contract.md, data rules; notes-iris.md, section 7). /read's column, no bar: the
// bar's Work and Contact only mean something on /. It doesn't import app/fonts.ts: the root
// not-found is part of every route's tree, so the display face would ship and preload on every
// route through it, not only on /, /read and /log, which set it. Its heading takes the text face.
export default function NotFound() {
  return (
    <>
      <SkipLink />
      {/* tabIndex -1: the skip link's landing spot, never a Tab stop. */}
      <main id="main" tabIndex={-1} className="lost page">
        <h1>Page not found</h1>
        <p>Nothing is drawn at this address.</p>
        <ul className="lost-links">
          <li>
            <a href="/">Back to the ship</a>
          </li>
          <li>
            <a href="/read">Read as page</a>
          </li>
        </ul>
      </main>
    </>
  );
}
