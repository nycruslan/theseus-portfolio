import type { Metadata } from "next";
import { Hero } from "@/components/hero";
import { ProjectCard } from "@/components/project-card";
import { Section } from "@/components/section";
import { SkipLink } from "@/components/skip-link";
import { profile } from "@/content/profile";
import { openGraph } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import { readSprintLog } from "@/lib/sprint-log";

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
  // Read when the site is built, like the log page itself, so the count and the page agree.
  const sprintCount = readSprintLog().length;

  return (
    <>
      <SkipLink />
      {/* A size container, so the hero can go full-bleed in units of the page's own width (the
        viewport less any scrollbar). Not on body or html: containment there stops the body's
        background from reaching the canvas. */}
      <div className="@container">
        {/* tabIndex -1: focusable by the skip link, never a Tab stop of its own. */}
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-2xl flex-col gap-16 px-6 py-24"
        >
          <script
            type="application/ld+json"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has to be the script's raw text (React would escape it as HTML), and escaping "<" keeps the data from closing the tag.
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(person).replace(/</g, "\\u003c"),
            }}
          />
          <header className="flex flex-col gap-4">
            <h1 className="text-step-2xl font-semibold tracking-tight">
              {profile.name}
            </h1>
            <p className="text-step-xl">{profile.headline}</p>
            <p className="text-step-base text-muted">{profile.location}</p>
            <p className="text-step-lg">{profile.bio}</p>
            {sprintCount > 0 ? (
              <p className="text-step-base">
                {/* Same classes as the Contact links. */}
                <a
                  href="/sprints"
                  className="inline-block text-step-base text-accent underline underline-offset-4 hover:text-foreground"
                >
                  Build log
                </a>
                {/* Starts with a no-break space, so the dot never begins a line. The dot has its own
                margin so the link's focus ring (4px out) clears it; textContent stays " · N sprints". */}
                <span className="text-muted">
                  {"\u00a0"}
                  <span className="mx-1">·</span>
                  {` ${sprintCount} ${sprintCount === 1 ? "sprint" : "sprints"}`}
                </span>
              </p>
            ) : null}
          </header>

          <Hero />

          <Section id="experience" title="Experience">
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
            {/* Same shape as an Experience entry, so the two read as one family. */}
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
                    className="inline-block text-step-base text-accent underline underline-offset-4 hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        </main>
      </div>
    </>
  );
}
