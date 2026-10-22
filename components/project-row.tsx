import type { Link, Project } from "@/content/profile";
import { projectLinkLabel } from "@/lib/project-link";

/** "ruslanshulga.com" → "ruslanshulga-com": an id from the project's name. */
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// One project as a row of the schedule (.crew/sprint/23/notes-iris.md, section 3): its name, its
// description, and one small link labelled from the owner's own links, in the date column from
// 1024 px and under the description below it. The row draws no box and has no hover of its own:
// the link is its one target. The link is named by the project and then its label ("Theseus
// GitHub"), so a screen reader's list of links tells the projects apart.
export function ProjectRow({
  project,
  links,
}: {
  project: Project;
  links: readonly Link[];
}) {
  const id = `project-${slug(project.name)}`;
  return (
    <li className="entry">
      <h3 id={id}>{project.name}</h3>
      <p className="entry-text entry-desc">{project.description}</p>
      {project.href ? (
        <p className="when when-link">
          <a
            id={`${id}-link`}
            href={project.href}
            aria-labelledby={`${id} ${id}-link`}
          >
            {projectLinkLabel(project.href, links)}
          </a>
        </p>
      ) : null}
    </li>
  );
}
