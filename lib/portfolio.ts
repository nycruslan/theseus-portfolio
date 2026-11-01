import { profile } from "@/content/profile";
import { type CaseStudy, COMPANY, caseStudies } from "@/content/work";

// The owner's facts as plain text, the one form the assistant, /llms.txt and the MCP server need.
// Everything here comes from content/, so these surfaces can't drift from the pages.

const email = profile.links
  .find((link) => link.href.startsWith("mailto:"))
  ?.href.replace("mailto:", "");

if (!email) throw new Error("content/profile.ts must list an Email link.");

export const OWNER_EMAIL = email;

export const studyPath = (study: CaseStudy) => `/work/${study.slug}`;

export function findStudy(slug: string) {
  return caseStudies.find((study) => study.slug === slug);
}

/** A study in one Markdown document. */
export function studyAsText(study: CaseStudy) {
  const sections = study.sections.map((section) => {
    const points = section.points?.map(
      (point) => `- ${point.lead} ${point.text}`,
    );
    return [`## ${section.title}`, section.text, ...(points ?? [])]
      .filter(Boolean)
      .join("\n");
  });
  const metrics = study.metrics.map((m) => `${m.label}: ${m.value}`).join("; ");
  return [
    `# ${study.title} (${COMPANY})`,
    study.blurb,
    `Results: ${metrics}`,
    `Stack: ${study.stack.join(", ")}`,
    ...sections,
  ].join("\n\n");
}

/** The résumé in one Markdown document. */
export function resumeAsText() {
  const roles = profile.experience.map(
    (role) =>
      `- ${role.company}, ${role.title} (${role.period}). ${role.summary}`,
  );
  const education = profile.education.map(
    (entry) => `- ${entry.school}, ${entry.credential} (${entry.period}).`,
  );
  const projects = profile.projects.map(
    (project) => `- ${project.name}: ${project.description}`,
  );
  return [
    `# ${profile.name}, ${profile.headline}`,
    `${profile.location}. ${profile.bio}`,
    `## Work\n${roles.join("\n")}`,
    `## Projects\n${projects.join("\n")}`,
    `## Stack\n${profile.stack.join(", ")}`,
    `## Education\n${education.join("\n")}`,
  ].join("\n\n");
}

/** Passages that share the most words with the query. Plain and inspectable, for a few pages. */
export function searchPortfolio(query: string, limit = 5) {
  const terms = [...new Set(query.toLowerCase().split(/[^a-z0-9%+~.]+/))]
    .filter((term) => term.length > 2)
    .slice(0, 24);
  const passages = [
    { source: "resume", text: resumeAsText() },
    ...caseStudies.flatMap((study) =>
      studyAsText(study)
        .split(/\n\n(?=## )/)
        .map((text) => ({ source: studyPath(study), text })),
    ),
  ];
  return passages
    .map((passage) => {
      const text = passage.text.toLowerCase();
      const score = terms.filter((term) => text.includes(term)).length;
      return { ...passage, score };
    })
    .filter((passage) => passage.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
