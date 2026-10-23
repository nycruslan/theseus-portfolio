import { MotionControl } from "@/components/model";

// The labelled bar at the top of the sheet (.crew/sprint/22/contract.md, B1.3; .crew/sprint/23/
// notes-iris.md, section 5): the wordmark, then a link to each place on the site that exists today.
// Crew joins it with its route (B4); a link to a page that isn't built yet would be a dead end for
// the visitor who clicks it. The wordmark is plain text, since it would link to the page it sits
// on. It sticks to the top while the page scrolls, so html's scroll-padding-top in app/globals.css
// keeps every fragment target and focused link clear of it. It isn't printed: on paper it is a
// strip of links nobody can follow. After the links, the motion control's slot: from 1024 px at the
// bar's right end, after Read as page; below it, a second row, right-aligned
// (.crew/sprint/27/contract.md).
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
      <div className="flex items-start justify-between border-b border-foreground px-4 lg:mx-4 lg:h-14 lg:items-center lg:justify-start lg:gap-10 lg:px-6">
        <p
          translate="no"
          className="flex h-[52px] items-center font-cond text-step-xl leading-none font-bold lg:h-auto"
        >
          Theseus
        </p>
        <nav
          aria-label="Main"
          className="flex flex-1 flex-wrap justify-end pb-2 lg:flex-nowrap lg:items-center lg:gap-6 lg:pb-0"
        >
          {/* The negative margin sets the last word on the bar's edge, its target running past it.
            From 1024 px Read as page takes the bar's right end before the control, as the frame
            draws it. */}
          <ul className="-mr-1.5 flex h-[52px] w-full items-center justify-end lg:mr-0 lg:h-auto lg:w-auto lg:flex-1 lg:justify-start lg:gap-7">
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
          <MotionControl />
        </nav>
      </div>
    </header>
  );
}
