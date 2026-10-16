// The first stop for a keyboard visitor: a plain fragment link, so it works with JavaScript off.
// It is visually hidden until focused, then pinned to the top left over the empty top padding (its
// text on the column's 24 px edge on phones), in the card links' look: ink, copper underline, on
// the page's own ground. The ring comes from the shared :focus-visible rule in app/globals.css. It
// lives in the page, not the root layout, so a route without a main (the 404) renders none.
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only text-step-base text-foreground underline decoration-accent decoration-1 underline-offset-4 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-20 focus:bg-background focus:px-4 focus:py-2"
    >
      Skip to content
    </a>
  );
}
