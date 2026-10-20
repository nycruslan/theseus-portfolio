import type { Metadata } from "next";
import { Section } from "@/components/section";
import { SkipLink } from "@/components/skip-link";
import { SprintItem } from "@/components/sprint-entry";
import { profile } from "@/content/profile";
import { openGraph } from "@/lib/metadata";
import { readSprintLog } from "@/lib/sprint-log";

const title = `Build log — ${profile.name}`;
// The shared description is the owner's bio; this page is the team's, so it says what it is.
const description =
  "A team of AI agents rebuilds this site one sprint at a time. Each entry shows a sprint's goal, its pull request, and what went wrong.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/sprints" },
  // Next replaces the layout's openGraph and twitter objects whole, so each says everything.
  openGraph: {
    ...openGraph,
    type: "website",
    title,
    description,
    url: "/sprints",
  },
  twitter: { card: "summary_large_image", title, description },
};

const LINK_CLASSES =
  "inline-block text-accent underline underline-offset-4 hover:text-foreground";

export default function Sprints() {
  // Read at build time (the route is static): the deployed site never touches .studio.
  const entries = readSprintLog();

  return (
    <>
      <SkipLink />
      <div className="@container">
        {/* tabIndex -1: focusable by the skip link, never a Tab stop of its own. */}
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-2xl flex-col gap-16 px-6 py-24"
        >
          <header className="flex flex-col gap-4">
            <p className="text-step-base">
              <a href="/" className={LINK_CLASSES}>
                {profile.name}
              </a>
            </p>
            <h1 className="text-step-2xl font-semibold tracking-tight">
              Build log
            </h1>
            <p className="text-pretty text-step-lg">
              A team of AI agents rebuilds this site one sprint at a time. Each
              entry comes from that sprint's retro: what it set out to do, its
              pull request, and what went wrong. Owner's call marks a sprint the
              team handed to the owner to decide.
            </p>
          </header>

          <Section id="sprints" title="Sprints">
            <ol className="flex flex-col gap-8">
              {entries.map((entry) => (
                <SprintItem key={entry.sprint} entry={entry} />
              ))}
            </ol>
          </Section>
        </main>
      </div>
    </>
  );
}
