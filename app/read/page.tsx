import type { Metadata } from "next";
import { sofiaCondensed } from "@/app/fonts";
import { LinesPlan } from "@/components/lines-plan";
import { PlankCount, PlankLegend } from "@/components/plank-key";
import { PrintButton } from "@/components/print-button";
import { SkipLink } from "@/components/skip-link";
import { profile } from "@/content/profile";
import { caseStudies } from "@/content/work";
import { PLANKS } from "@/lib/hull-layouts";
import { seatPlanks } from "@/lib/lines-plan";
import { openGraph } from "@/lib/metadata";
import { studyPath } from "@/lib/portfolio";
import { SITE_URL } from "@/lib/site";
import { readSprintLog } from "@/lib/sprint-log";

const title = `Read as page — ${profile.name}`;

// Its own address, for search engines and link previews. Next replaces the layout's openGraph and
// twitter objects whole, so each says everything, and the card comes from this segment's own
// opengraph-image.
export const metadata: Metadata = {
  title,
  alternates: { canonical: "/read" },
  openGraph: { ...openGraph, title, url: "/read" },
  twitter: { card: "summary_large_image", title, description: profile.bio },
};

/** Where the printout says it came from: the site's host and this page's path. */
const ADDRESS = `${new URL(SITE_URL).host}/read`;

// The record as one plain, printable column (.crew/sprint/23/contract.md, data rules, "/read";
// notes-iris.md, section 6): the same facts as / in the order a résumé reads, the ship's drawing at
// the foot. It reads the same with scripts off; Print is the only thing they add. No bar, no
// revision block, no Detail A and no JSON-LD: those are the sheet's.
export default function Read() {
  // Read when the site is built, as on /, so the two drawings and counts agree.
  const entries = readSprintLog();
  const seats = seatPlanks(entries.map((entry) => entry.sprint).reverse());
  const replaced = Math.min(entries.length, PLANKS.length);

  return (
    <>
      <SkipLink />
      <header className="strip page">
        <a href="/" className="strip-back">
          Back to the ship
        </a>
        <p className="strip-url">{ADDRESS}</p>
        <div className="strip-print">
          <PrintButton />
        </div>
      </header>
      {/* tabIndex -1: the skip link's landing spot, never a Tab stop. */}
      <main
        id="main"
        tabIndex={-1}
        className={`read page ${sofiaCondensed.variable}`}
      >
        <header>
          <h1>{profile.name}</h1>
          <p className="read-role">
            {profile.headline}
            <span>{` · ${profile.location}`}</span>
          </p>
          <p className="read-bio">{profile.bio}</p>
          <ul id="contact" aria-label="Contact" className="read-contact">
            {profile.links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </header>

        <section aria-labelledby="work">
          <h2 id="work">Work</h2>
          <ol>
            {profile.experience.map((role) => (
              <li key={`${role.company}-${role.period}`} className="read-entry">
                <h3>{role.company}</h3>
                <p className="read-meta">
                  {role.title} · {role.period}
                </p>
                <p className="read-text">{role.summary}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="case-studies">
          <h2 id="case-studies">Case studies</h2>
          <ul>
            {caseStudies.map((study) => (
              <li key={study.slug} className="read-entry">
                <h3>
                  <a href={studyPath(study)}>{study.title}</a>
                </h3>
                <p className="read-text">{study.blurb}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="projects">
          <h2 id="projects">Projects</h2>
          <ul>
            {profile.projects.map((project) => (
              <li key={project.name} className="read-entry">
                <h3>
                  {project.href ? (
                    <a href={project.href}>{project.name}</a>
                  ) : (
                    project.name
                  )}
                </h3>
                <p className="read-text">{project.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="stack">
          <h2 id="stack">Stack</h2>
          <p className="read-text">{profile.stack.join(", ")}</p>
        </section>

        <section aria-labelledby="education">
          <h2 id="education">Education</h2>
          <ol>
            {profile.education.map((entry) => (
              <li
                key={`${entry.school}-${entry.period}`}
                className="read-entry"
              >
                <h3>{entry.school}</h3>
                <p className="read-meta">
                  {entry.credential} · {entry.period}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="ship">
          <h2 id="ship">The ship</h2>
          <figure className="ship">
            <div className="ship-plan">
              <LinesPlan seats={seats} view="page" />
            </div>
            <figcaption>
              <div className="ship-key">
                <PlankCount planks={PLANKS.length} replaced={replaced} />
                <PlankLegend />
              </div>
              <p className="ship-note">
                Each replaced plank is one merged sprint; all {entries.length}{" "}
                revisions are in <a href="/log">the Log</a>.
              </p>
            </figcaption>
          </figure>
        </section>
      </main>
    </>
  );
}
