// The labelled bar at the top of the sheet (.crew/sprint/22/contract.md, B1.3; .crew/sprint/23/
// notes-iris.md, section 5): the wordmark, then a link to each place on the site that exists today.
// Crew joins it with its route (B4); a link to a page that isn't built yet would be a dead end for
// the visitor who clicks it. The wordmark is plain text, since it would link to the page it sits
// on. It sticks to the top while the page scrolls, so html's scroll-padding-top in app/globals.css
// keeps every fragment target and focused link clear of it. It isn't printed: on paper it is a
// strip of links nobody can follow.
const LINKS = [
  { label: "Work", href: "#work" },
  { label: "Log", href: "/sprints" },
  { label: "Contact", href: "#contact" },
  // Underlined at rest, unlike the sheet's own places: it leaves the sheet for another view.
  { label: "Read as page", href: "/read", away: true },
];

export function Bar({ className = "" }: { className?: string }) {
  return (
    <header
      className={`sticky top-0 z-10 bg-background print:hidden lg:mt-4 ${className}`}
    >
      <div className="flex h-[52px] items-center justify-between border-b border-foreground px-4 lg:mx-4 lg:h-14 lg:justify-start lg:gap-10 lg:px-6">
        <p
          translate="no"
          className="font-cond text-step-xl leading-none font-bold"
        >
          Theseus
        </p>
        <nav aria-label="Main" className="lg:flex-1">
          {/* The negative margin sets the last word on the bar's edge, its target running past it.
            From 1024 px Read as page takes the bar's right end, as the frame draws it. */}
          <ul className="-mr-1.5 flex lg:mr-0 lg:gap-7">
            {LINKS.map((link) => (
              <li key={link.href} className={link.away ? "lg:ml-auto" : ""}>
                {/* 44 px tall on phones, as the canvas draws them; 6 px sides and, under 360 px,
                  the small step keep all four on one line down to 320. */}
                <a
                  href={link.href}
                  className={`flex min-h-11 items-center px-1.5 text-step-base font-semibold text-foreground underline-offset-[6px] max-[359px]:text-step-sm lg:min-h-0 lg:px-0 lg:py-1.5 ${link.away ? "underline decoration-1 hover:decoration-2" : "decoration-2 hover:underline"}`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
