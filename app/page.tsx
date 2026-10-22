import type { Metadata } from "next";
import { Sofia_Sans_Extra_Condensed } from "next/font/google";
import { Bar } from "@/components/bar";
import { LinesPlan } from "@/components/lines-plan";
import { ProjectCard } from "@/components/project-card";
import { Revisions } from "@/components/revisions";
import { Section } from "@/components/section";
import { SkipLink } from "@/components/skip-link";
import { TitleBlock } from "@/components/title-block";
import { profile } from "@/content/profile";
import { splitBio } from "@/lib/bio";
import { PLANKS, seatPlanks } from "@/lib/lines-plan";
import { openGraph } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import { readSprintLog } from "@/lib/sprint-log";

// The sheet's display face: the name, the wordmark and the Revisions head. Called here, not in the
// layout, so only this page preloads it and /sprints stays one family (contract, B1.10). `optional`
// draws with the face only if it is there for the first paint, so it never swaps in later and moves
// the page (B1.8); the fallback next/font fits to its metrics holds the same lines meanwhile (see
// app/layout.tsx on why there is no `fallback` list).
const sofiaCondensed = Sofia_Sans_Extra_Condensed({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-sofia-cond",
});

// This page's own address, for search engines and link previews (see app/layout.tsx).
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...openGraph, url: "/" },
};

// Who this page is about, for search engines: the owner's facts from content/profile.ts as they
// appear on the page, and nothing more.
const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.headline,
  description: profile.bio,
  url: SITE_URL,
  sameAs: profile.links.map((link) => link.href),
};

export default function Home() {
  // Read when the site is built, like the log page itself, so the sheet and the Log agree. Newest
  // first; the planks are seated oldest first.
  const entries = readSprintLog();
  const seats = seatPlanks(entries.map((entry) => entry.sprint).reverse());
  const replaced = Math.min(entries.length, PLANKS.length);

  return (
    <>
      <SkipLink />
      <Bar className={sofiaCondensed.variable} />
      {/* The sheet (.crew/sprint/22/contract.md): the drawing, then the title block and the revision
        block side by side from 1024 px inside a frame 16 px in, stacked below it with the title
        block first. The title block leads in the DOM at every width, so the name is read first. The
        facts follow below the sheet. tabIndex -1: the skip link's landing spot, never a Tab stop. */}
      <main
        id="main"
        tabIndex={-1}
        className={`grid grid-cols-1 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)] lg:px-4 ${sofiaCondensed.variable}`}
      >
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has to be the script's raw text (React would escape it as HTML), and escaping "<" keeps the data from closing the tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(person).replace(/</g, "\\u003c"),
          }}
        />
        <LinesPlan
          seats={seats}
          className="lg:col-span-2 lg:border-x lg:border-foreground"
        />
        <TitleBlock className="lg:col-start-2 lg:row-start-2" />
        <Revisions
          entries={entries}
          caption={splitBio(profile.bio).rest}
          planks={PLANKS.length}
          replaced={replaced}
          className="lg:col-start-1 lg:row-start-2"
        />

        <div className="mx-auto flex w-full max-w-2xl flex-col gap-16 px-6 pt-10 pb-24 lg:col-span-2 lg:pt-14">
          <Section id="work" title="Work">
            <ol className="flex flex-col gap-8">
              {profile.experience.map((role) => (
                <li key={`${role.company}-${role.period}`}>
                  {/* A no-break space keeps "· Company" together, so the dot never ends a line. */}
                  <h3 className="text-balance text-step-lg font-medium">
                    {role.title} ·&nbsp;{role.company}
                  </h3>
                  <p className="text-step-sm text-muted">{role.period}</p>
                  <p className="mt-2 text-step-base">{role.summary}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="projects" title="Projects">
            <ul className="flex flex-col">
              {profile.projects.map((project) => (
                <ProjectCard key={project.name} project={project} />
              ))}
            </ul>
          </Section>

          <Section id="stack" title="Stack">
            {/* Plain words on a wrapping line. The dot between tools is drawn, not typed, so no
            separator text ends up inside an item. Each item draws a dot in the gap before it, and
            the list clips the one that falls left of a row's first item. Only x is clipped, so y stays
            visible. In forced colors the browser drops background colours, hence the CanvasText dot. */}
            <ul className="flex flex-wrap gap-x-6 gap-y-1 overflow-x-clip">
              {profile.stack.map((tool) => (
                <li
                  key={tool}
                  className="relative text-step-base before:absolute before:top-1/2 before:-left-[calc(0.75rem+1.5px)] before:-mt-[1.5px] before:size-[3px] before:rounded-full before:bg-muted forced-colors:before:bg-[CanvasText] before:content-['']"
                >
                  {tool}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="education" title="Education">
            {/* Same shape as a Work entry, so the two read as one family. */}
            <ol className="flex flex-col gap-8">
              {profile.education.map((entry) => (
                <li key={`${entry.school}-${entry.period}`}>
                  <h3 className="text-balance text-step-lg font-medium">
                    {entry.school}
                  </h3>
                  <p className="text-step-sm text-muted">{entry.period}</p>
                  <p className="mt-2 text-pretty text-step-base">
                    {entry.credential}
                  </p>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="contact" title="Contact">
            <ul className="flex flex-wrap gap-6">
              {profile.links.map((link) => (
                <li key={link.href}>
                  {/* inline-block so the target is the whole 1.6 line box (WCAG 2.2's 24 px
                  minimum), not the shorter glyph box an inline link reports. */}
                  <a
                    href={link.href}
                    className="inline-block text-step-base text-foreground underline decoration-1 underline-offset-[3px] hover:decoration-2"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </main>
    </>
  );
}
