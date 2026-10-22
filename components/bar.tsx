// The labelled bar at the top of the sheet (.crew/sprint/22/contract.md, B1.3; notes-iris.md, section
// 6): the wordmark, then a link to each place on the site that exists today. Crew and "Read as
// page" join it with their routes (B4, B2); a link to a page that isn't built yet would be a dead
// end for the visitor who clicks it. The wordmark is plain text, since it would link to the page
// it sits on. It sticks to the top while the page scrolls, so html's scroll-padding-top in
// app/globals.css keeps every fragment target and focused link clear of it.
const LINKS = [
  { label: "Work", href: "#work" },
  { label: "Log", href: "/sprints" },
  { label: "Contact", href: "#contact" },
];

export function Bar({ className = "" }: { className?: string }) {
  return (
    <header
      className={`sticky top-0 z-10 bg-background print:static lg:mt-4 ${className}`}
    >
      <div className="flex h-[52px] items-center justify-between border-b border-foreground px-4 lg:mx-4 lg:h-14 lg:justify-start lg:gap-10 lg:px-6">
        <p
          translate="no"
          className="font-cond text-step-xl leading-none font-bold"
        >
          Theseus
        </p>
        <nav aria-label="Main">
          {/* The negative margin sets the last word on the bar's edge, its target running past it. */}
          <ul className="-mr-2 flex max-[359px]:-mr-1.5 lg:mr-0 lg:gap-7">
            {LINKS.map((link) => (
              <li key={link.href}>
                {/* 44 px tall on phones, as the canvas draws them; 6 px sides at 320 keep it one line. */}
                <a
                  href={link.href}
                  className="flex min-h-11 items-center px-2 text-step-base font-semibold text-foreground underline-offset-[6px] decoration-2 hover:underline max-[359px]:px-1.5 lg:min-h-0 lg:px-0 lg:py-1.5"
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
