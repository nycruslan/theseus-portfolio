import type { Project } from "@/content/profile";

type ProjectCardProps = {
  project: Project;
};

// One plank of the hull (.studio/sprint/3/direction.md). The frame hangs into the column's gutter
// by exactly its own padding (24 px on phones, 32 px from md), so the text keeps the column's left
// edge and the arrow ends on its right edge. From md the frame has side rules too, so the inline
// padding gives back their 1 px to keep that edge exact. Planks share a seam: each after the first
// pulls up 1 px, so a hovered or focused plank is lifted (z-10, no movement) to paint its copper
// over that seam.
const plank =
  "relative -mx-6 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-y border-rule px-6 py-5 not-first:-mt-px md:-mx-8 md:border md:px-[calc(--spacing(8)-1px)] md:py-8";

export function ProjectCard({ project }: ProjectCardProps) {
  // No href, no promise of a link: same frame, plain name, no underline, arrow, hover or focus.
  if (!project.href) {
    return (
      <li className={plank}>
        <h3 className="col-span-2 text-balance text-step-lg font-medium">
          {project.name}
        </h3>
        <p className="col-span-2 text-step-base">{project.description}</p>
      </li>
    );
  }

  return (
    <li
      className={`group ${plank} hover:z-10 hover:border-accent has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:z-10 has-[a:focus-visible]:outline-accent`}
    >
      <h3 className="text-balance text-step-lg font-medium">
        {/* The link's ::after covers the whole card (the li is its containing block), so a thumb
            anywhere on the plank opens it while the link's name stays the project name alone. The
            card draws the focus ring, so the link draws none, in forced colors too: `none`, not
            `hidden`, which Tailwind turns into a second ring there. */}
        <a
          href={project.href}
          className="text-foreground underline decoration-accent decoration-1 underline-offset-4 after:absolute after:inset-0 focus-visible:outline-none"
        >
          {project.name}
        </a>
      </h3>
      {/* One line box of the title's step, so the arrow centres on the title's first line even
          when a long name wraps. It turns copper for keyboard focus as it does for hover. */}
      <span className="flex h-[1lh] items-center text-step-lg text-muted group-hover:text-accent group-has-[a:focus-visible]:text-accent">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-[1em]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        >
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      </span>
      <p className="col-span-2 text-step-base">{project.description}</p>
    </li>
  );
}
