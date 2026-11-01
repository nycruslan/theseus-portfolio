import type { Metadata } from "next";
import { Document } from "@/components/document";
import { Schedule } from "@/components/schedule";
import { profile } from "@/content/profile";
import { readEvals } from "@/lib/evals";
import { openGraph } from "@/lib/metadata";

const title = `How the assistant is tested — ${profile.name}`;
const description =
  "Weekly scores for this site's assistant: groundedness, scope control, persona integrity and prompt-injection resistance, every case included.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/evals" },
  openGraph: { ...openGraph, title, description, url: "/evals" },
  twitter: { card: "summary_large_image", title, description },
};

const day = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

/** "anthropic/claude-haiku-5.5" reads as "claude-haiku-5.5". */
const modelName = (id: string) => id.split("/").at(-1);

export default async function EvalsPage() {
  const report = await readEvals();

  return (
    <Document>
      <header className="doc-head">
        <h1>How the assistant is tested</h1>
        <p className="doc-lead">
          Every Monday, a fixed set of questions goes through the same request{" "}
          <a className="text-link" href="/ask">
            the assistant
          </a>{" "}
          uses, and a stronger model grades each answer. A failure shows up here
          like anything else.
        </p>
        {report ? (
          <dl className="particulars">
            <div>
              <dt>Overall score, out of 10</dt>
              <dd>{report.overall}</dd>
            </div>
            <div>
              <dt>Cases passed</dt>
              <dd>
                {report.passed} of {report.total}
              </dd>
            </div>
            <div>
              <dt>
                {modelName(report.model)}, graded by{" "}
                {modelName(report.judgeModel)}
              </dt>
              <dd>{day.format(new Date(report.ranAt))}</dd>
            </div>
          </dl>
        ) : (
          <p className="doc-lead">
            No report is published yet. The next run is on Monday.
          </p>
        )}
      </header>

      {report?.categories.map((category, index) => (
        <Schedule key={category.label} id={`c${index}`} title={category.label}>
          <ul className="sched-body">
            {category.cases.map((testCase) => (
              <li key={testCase.prompt} className="entry">
                <h3>{testCase.prompt}</h3>
                <p className="when">
                  {testCase.passed ? "Passed" : "Failed"}, {testCase.score} of
                  10
                </p>
                <p className="score-note">{testCase.note}</p>
              </li>
            ))}
          </ul>
        </Schedule>
      ))}
    </Document>
  );
}
