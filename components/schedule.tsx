import type { ReactNode } from "react";

type ScheduleProps = {
  id: string;
  title: string;
  className?: string;
  children: ReactNode;
};

// One section of the facts on / as a drawing's schedule (.crew/sprint/23/notes-iris.md, section 2):
// a 2 px ink rule, the big condensed head in the left three columns from 1024 px and its list in
// the other nine, the head above the list below that (app/globals.css, "The facts"). The h2 carries
// the id the bar's links and the skip targets use, and names the region.
export function Schedule({
  id,
  title,
  className = "",
  children,
}: ScheduleProps) {
  return (
    <section aria-labelledby={id} className={`sched ${className}`}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}
