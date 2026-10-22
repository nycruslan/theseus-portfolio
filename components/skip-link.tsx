// The first stop for a keyboard visitor: a plain fragment link, so it works with JavaScript off.
// It is visually hidden until focused (its frame too, or the hidden box would be 2 px wide), then
// pinned 16 px in from the top left, over the bar, as a boxed label on the sheet: ink on film inside
// a 1 px ink frame. The ring comes from the shared
// :focus-visible rule in app/globals.css. It lives in each page (and the 404), not the root
// layout, so it renders only beside a main to land on.
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only bg-background text-step-base font-semibold text-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-20 focus:border focus:border-foreground focus:px-4 focus:py-2"
    >
      Skip to content
    </a>
  );
}
