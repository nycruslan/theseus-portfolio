import { Fragment } from "react";
import { DetailA } from "@/components/detail-a";
import { ProjectRow } from "@/components/project-row";
import { Schedule } from "@/components/schedule";
import { profile } from "@/content/profile";
import { COMPANY, caseStudies } from "@/content/work";
import { DETAIL_A_COMPANY, detailA } from "@/lib/detail-a";
import { studyPath } from "@/lib/portfolio";
import { sentences } from "@/lib/sentences";

/**
 * A Work summary a sentence to a line (.crew/sprint/41/contract.md, P14), so the figures can be
 * scanned: each sentence its own span, set on its own line by app/globals.css, still one paragraph
 * of the owner's. The space between the spans keeps the paragraph's text as he wrote it, with
 * single spaces, for anything that reads it as text. Keyed by the sentence and its occurrence, as
 * the owner may repeat one.
 */
function Sentences({ text }: { text: string }) {
  const seen = new Map<string, number>();
  return sentences(text).map((sentence, i) => {
    const occurrence = (seen.get(sentence) ?? 0) + 1;
    seen.set(sentence, occurrence);
    return (
      <Fragment key={`${sentence}-${occurrence}`}>
        {i > 0 ? " " : null}
        <span data-sentence="">{sentence}</span>
      </Fragment>
    );
  });
}

// The record below the sheet, as a drawing's schedule (.crew/sprint/23/contract.md, data rules;
// notes-iris.md, sections 2 and 3): Work, Case studies, Projects, Stack, Education and Contact, the owner's facts
// from content/profile.ts as he wrote them. In every entry the h3 comes first in the DOM, so it is
// read first; the grid sets the period in the left column from 1024 px and above the h3 below that
// (app/globals.css, "The facts").
export function Facts({ className = "" }: { className?: string }) {
  return (
    <div className={`facts ${className}`}>
      <Schedule id="work" title="Work">
        <ol className="sched-body">
          {profile.experience.map((role) => {
            const labels =
              role.company === DETAIL_A_COMPANY ? detailA(role.summary) : null;
            return (
              <li key={`${role.company}-${role.period}`} className="entry">
                <h3>{role.company}</h3>
                <p className="entry-role">{role.title}</p>
                <p className="when">{role.period}</p>
                <p className="entry-text">
                  <Sentences text={role.summary} />
                </p>
                {labels ? <DetailA labels={labels} /> : null}
              </li>
            );
          })}
        </ol>
      </Schedule>

      <Schedule id="case-studies" title="Case studies">
        <ul className="sched-body">
          {caseStudies.map((study) => (
            <li key={study.slug} className="entry">
              <h3>
                <a href={studyPath(study)} className="entry-link">
                  {study.title}
                </a>
              </h3>
              <p className="entry-text entry-desc">{study.blurb}</p>
              {/* Only a figure earns the eye here; the words-only results stay on the study. */}
              {/\d/.test(study.metrics[0]?.value ?? "") ? (
                <p className="when">
                  {study.metrics[0]?.value}
                  <br />
                  {study.metrics[0]?.label}
                </p>
              ) : (
                <p className="when">{COMPANY}</p>
              )}
            </li>
          ))}
        </ul>
      </Schedule>

      <Schedule id="projects" title="Projects">
        <ul className="sched-body">
          {profile.projects.map((project) => (
            <ProjectRow
              key={project.name}
              project={project}
              links={profile.links}
            />
          ))}
        </ul>
      </Schedule>

      <Schedule id="stack" title="Stack">
        {/* Plain words on a wrapping line. The dot between tools is drawn, not typed, so no
          separator text ends up inside an item. Each item draws a dot in the gap before it, and
          the list clips the one that falls left of a row's first item. Only x is clipped, so y
          stays visible. In forced colors the browser drops background colours, hence the
          CanvasText dot. */}
        <ul className="sched-body sched-stack flex flex-wrap gap-x-6 gap-y-1 overflow-x-clip">
          {profile.stack.map((tool) => (
            <li
              key={tool}
              className="relative text-step-base before:absolute before:top-1/2 before:-left-[calc(0.75rem+1.5px)] before:-mt-[1.5px] before:size-[3px] before:rounded-full before:bg-muted forced-colors:before:bg-[CanvasText] before:content-['']"
            >
              {tool}
            </li>
          ))}
        </ul>
      </Schedule>

      <Schedule id="education" title="Education" className="sched-education">
        {/* Same shape as a Work entry, a step smaller, so the two read as one family. */}
        <ol className="sched-body">
          {profile.education.map((entry) => (
            <li key={`${entry.school}-${entry.period}`} className="entry">
              <h3>{entry.school}</h3>
              <p className="entry-role entry-credential">{entry.credential}</p>
              <p className="when">{entry.period}</p>
            </li>
          ))}
        </ol>
      </Schedule>

      <Schedule id="contact" title="Contact" className="sched-contact">
        <ul className="sched-body sched-links">
          {profile.links.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </Schedule>
    </div>
  );
}
