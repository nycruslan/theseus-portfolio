import type { ReactNode } from "react";

// The labelled bar at the top of the sheet (.crew/sprint/22/contract.md, B1.3; .crew/sprint/23/
// notes-iris.md, section 5): the wordmark, then a link to each place on the site that exists today,
// Crew among them since its route does (.crew/sprint/31/contract.md, "The bar"). Below 768 px five
// don't fit, so Read as page leaves the bar for the drawing's foot (app/page.tsx, app/crew/page.tsx)
// and stays in the nav's DOM, hidden. On the sheet the wordmark is plain text, since it would link to the
// page it sits on. It sticks to the top while the page scrolls, so html's scroll-padding-top in
// app/globals.css keeps every fragment target and focused link clear of it. It isn't printed: on
// paper it is a strip of links nobody can follow. After the links, the sheet passes the motion
// control into its slot, shown from 768 px: from 1024 at the bar's right end after Read as page, as
// the approved frame draws it. Below 768 the bar is full, and the control sits at the drawing's foot
// (app/page.tsx; .crew/sprint/27/). The control is a slot, not an import, so its client module
// ships only where the sheet renders it.
//
// On the Log and its records (.crew/sprint/29/b5-first-contract.md, "The bar"), the wordmark is the
// way home, Work and Contact point at the sheet's sections, and Log is current. No control: there is
// no model on the Log to move. /crew's bar is the Log's, with Crew current.
type BarProps = {
  /** Where the bar is: the sheet, the Log, one of the Log's records, or the crew's page. */
  at?: "sheet" | "log" | "record" | "crew";
  /** The motion control, from the sheet. */
  control?: ReactNode;
  className?: string;
};

const LINK_CLASSES =
  "flex min-h-11 items-center px-1.5 text-step-base whitespace-nowrap font-semibold text-foreground underline-offset-[6px] max-[359px]:text-step-sm lg:min-h-0 lg:px-0 lg:py-1.5";

type BarLink = {
  label: string;
  href: string;
  /** The page's own place: Log on the Log ("page") and on a record ("true"). */
  current?: "page" | "true";
  /** It leaves the sheet for another view. */
  away?: boolean;
};

/** Underlined at rest: away, and the current place. The sheet's own places on hover only. */
const decoration = ({ away, current }: BarLink) =>
  away
    ? "underline decoration-1 hover:decoration-2"
    : current
      ? "underline decoration-2"
      : "decoration-2 hover:underline";

export function Bar({ at = "sheet", control, className = "" }: BarProps) {
  const home = at === "sheet" ? "" : "/";
  const links: BarLink[] = [
    { label: "Work", href: `${home}#work` },
    {
      label: "Crew",
      href: "/crew",
      current: at === "crew" ? "page" : undefined,
    },
    {
      label: "Log",
      href: "/sprints",
      current: at === "log" ? "page" : at === "record" ? "true" : undefined,
    },
    { label: "Contact", href: `${home}#contact` },
    { label: "Read as page", href: "/read", away: true },
  ];

  return (
    <header
      className={`sticky top-0 z-10 bg-background print:hidden lg:mt-4 ${className}`}
    >
      <div className="flex h-[52px] items-center justify-between border-b border-foreground px-4 lg:mx-4 lg:h-14 lg:justify-start lg:gap-10 lg:px-6">
        <p
          translate="no"
          className="font-cond text-step-xl leading-none font-bold"
        >
          {/* 44 px tall on phones, as the links beside it; 24 from 1024 px. */}
          {home ? (
            <a
              href="/"
              className="flex min-h-11 items-center text-foreground decoration-2 underline-offset-[6px] hover:underline lg:min-h-6"
            >
              Theseus
            </a>
          ) : (
            "Theseus"
          )}
        </p>
        <nav
          aria-label="Main"
          className="md:flex md:items-center md:gap-[18px] lg:flex-1 lg:gap-6"
        >
          {/* Below 768 px the negative margin sets the last word on the bar's edge, its target
            running past it. From 1024 px Read as page ends the links, at the right before the
            control, as the frame draws it. */}
          <ul className="-mr-1.5 flex md:mr-0 lg:flex-1 lg:gap-7">
            {links.map((link) => (
              <li
                key={link.label}
                className={link.away ? "max-md:hidden lg:ml-auto" : ""}
              >
                {/* 44 px tall on phones, as the canvas draws them; 6 px sides and, under 360 px,
                  the small step keep four on one line down to 320. A label never breaks, in
                  either face. The current place is underlined, as the frame draws Log on /log. */}
                <a
                  href={link.href}
                  aria-current={link.current}
                  className={`${LINK_CLASSES} ${decoration(link)}`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          {control}
        </nav>
      </div>
    </header>
  );
}
