import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Document } from "@/components/document";
import { Flow } from "@/components/flow";
import { Schedule } from "@/components/schedule";
import { profile } from "@/content/profile";
import { COMPANY, caseStudies } from "@/content/work";
import { openGraph } from "@/lib/metadata";
import { findStudy, OWNER_EMAIL, studyPath } from "@/lib/portfolio";

export function generateStaticParams() {
  return caseStudies.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/work/[slug]">): Promise<Metadata> {
  const study = findStudy((await params).slug);
  if (!study) notFound();
  const title = `${study.title} — ${profile.name}`;
  const url = studyPath(study);
  return {
    title,
    description: study.blurb,
    alternates: { canonical: url },
    openGraph: {
      ...openGraph,
      type: "article",
      title,
      description: study.blurb,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: study.blurb,
    },
  };
}

export default async function CaseStudyPage({
  params,
}: PageProps<"/work/[slug]">) {
  const study = findStudy((await params).slug);
  if (!study) notFound();
  const index = caseStudies.indexOf(study);
  const next = caseStudies[(index + 1) % caseStudies.length];

  return (
    <Document at="work">
      <article>
        <header className="doc-head">
          <a href="/#case-studies" className="doc-back">
            All case studies
          </a>
          <h1>{study.title}</h1>
          <p className="doc-lead">{study.blurb}</p>
          <dl className="doc-results">
            {study.metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
            <div>
              <dt>Built at</dt>
              <dd>{COMPANY}</dd>
            </div>
          </dl>
        </header>

        <Schedule id="system" title="The system">
          <Flow stages={study.flow} title={study.title} />
        </Schedule>

        {study.sections.map((section) => (
          <Schedule key={section.id} id={section.id} title={section.title}>
            <div className="sched-body">
              {section.text ? (
                <p className="entry-text">{section.text}</p>
              ) : null}
              {section.points ? (
                <ul>
                  {section.points.map((point) => (
                    <li key={point.lead} className="point">
                      <strong>{point.lead}</strong>
                      <span className="entry-text">{point.text}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Schedule>
        ))}

        <Schedule id="stack" title="Stack">
          <p className="sched-body entry-text">{study.stack.join(", ")}</p>
        </Schedule>
      </article>

      <nav aria-label="Next steps" className="doc-next">
        <a href={`mailto:${OWNER_EMAIL}`} className="doc-next-link">
          Email {profile.name}
        </a>
        <p>
          Or{" "}
          <a className="text-link" href="/ask">
            ask the assistant about this work
          </a>
          .
        </p>
        {next ? (
          <p>
            Next case study:{" "}
            <a className="text-link" href={studyPath(next)}>
              {next.title}
            </a>
          </p>
        ) : null}
      </nav>
    </Document>
  );
}
