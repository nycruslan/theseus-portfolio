import type { Metadata } from "next";
import { Ask } from "@/components/ask";
import { Document } from "@/components/document";
import { Schedule } from "@/components/schedule";
import { profile } from "@/content/profile";
import { CANNOT_ANSWER } from "@/lib/assistant";
import { openGraph } from "@/lib/metadata";
import { OWNER_EMAIL } from "@/lib/portfolio";
import { SITE_URL } from "@/lib/site";

const title = `Ask about my work — ${profile.name}`;
const description = `Ask an assistant about ${profile.name}'s work. It answers only from his record, and its test scores are public.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/ask" },
  openGraph: { ...openGraph, title, description, url: "/ask" },
  twitter: { card: "summary_large_image", title, description },
};

const FOR_AGENTS = [
  { label: "MCP server", href: "/api/mcp", note: "Read-only, no auth" },
  { label: "llms.txt", href: "/llms.txt", note: "A map of this site" },
  { label: "Résumé as JSON", href: "/api/me.json", note: "The same facts" },
];

export default function AskPage() {
  return (
    <Document>
      <header className="doc-head">
        <h1>Ask about my work</h1>
        <p className="doc-lead">
          An assistant that answers only from my résumé and case studies. When
          the answer isn't there, it says so.{" "}
          <a className="text-link" href="/evals">
            See how it's tested
          </a>
          .
        </p>
      </header>

      <Schedule id="questions" title="Questions">
        <noscript>
          <p className="sched-body entry-text">
            The assistant needs JavaScript. Email{" "}
            <a className="text-link" href={`mailto:${OWNER_EMAIL}`}>
              {OWNER_EMAIL}
            </a>{" "}
            instead, or{" "}
            <a className="text-link" href="/read">
              read the record
            </a>
            .
          </p>
        </noscript>
        <Ask fallback={CANNOT_ANSWER} />
      </Schedule>

      <Schedule id="for-agents" title="For AI agents">
        <ul className="sched-body">
          {FOR_AGENTS.map((item) => (
            <li key={item.href} className="point">
              <strong>
                <a className="text-link" href={item.href}>
                  {item.label}
                </a>
              </strong>
              <span className="entry-text">
                {item.note}: {new URL(SITE_URL).host}
                {item.href}
              </span>
            </li>
          ))}
        </ul>
      </Schedule>
    </Document>
  );
}
