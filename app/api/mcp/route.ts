import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { profile } from "@/content/profile";
import { caseStudies } from "@/content/work";
import { readEvals } from "@/lib/evals";
import {
  findStudy,
  OWNER_EMAIL,
  resumeAsText,
  searchPortfolio,
  studyAsText,
  studyPath,
} from "@/lib/portfolio";
import { SITE_URL } from "@/lib/site";

// A public, read-only MCP server: an agent can query this portfolio with tools instead of scraping
// it. Everything it serves is already public on the site.

const text = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    },
  ],
});

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_resume",
      {
        title: "Get résumé",
        description: `${profile.name}'s roles, projects, stack and education.`,
      },
      () => text(resumeAsText()),
    );

    server.registerTool(
      "list_projects",
      {
        title: "List case studies",
        description:
          "The case studies with their slugs, summaries and results. Follow with get_project for depth.",
      },
      () =>
        text(
          caseStudies.map((study) => ({
            slug: study.slug,
            title: study.title,
            summary: study.blurb,
            results: study.metrics,
            url: `${SITE_URL}${studyPath(study)}`,
          })),
        ),
    );

    server.registerTool(
      "get_project",
      {
        title: "Get a case study",
        description:
          "One case study in full: the problem, the architecture, the key decisions and what broke.",
        inputSchema: z.object({
          slug: z.string().describe('A slug from list_projects: "hybrid-rag"'),
        }),
      },
      ({ slug }) => {
        const study = findStudy(slug);
        if (study) return text(studyAsText(study));
        const slugs = caseStudies.map((s) => s.slug).join(", ");
        return text(`No case study "${slug}". Available: ${slugs}.`);
      },
    );

    server.registerTool(
      "search_portfolio",
      {
        title: "Search the portfolio",
        description:
          "Find passages across the résumé and case studies for a specific fact, tool or metric.",
        inputSchema: z.object({
          query: z
            .string()
            .max(200)
            .describe('Search terms: "rerank precision"'),
        }),
      },
      ({ query }) => {
        const hits = searchPortfolio(query);
        return text(hits.length ? hits : `No matches for "${query}".`);
      },
    );

    server.registerTool(
      "get_eval_summary",
      {
        title: "Get the assistant's eval scores",
        description:
          "The latest weekly scores for this site's own assistant: groundedness, scope, persona and injection resistance.",
      },
      async () => {
        const report = await readEvals();
        if (!report) return text("No eval run is published yet.");
        const { categories, ...summary } = report;
        return text({
          ...summary,
          categories: categories.map(({ cases: _, ...rest }) => rest),
          report: `${SITE_URL}/evals`,
        });
      },
    );

    server.registerTool(
      "get_contact",
      {
        title: "Get contact details",
        description: `How to reach ${profile.name}.`,
      },
      () =>
        text({
          email: OWNER_EMAIL,
          links: profile.links,
          location: profile.location,
        }),
    );
  },
  {
    serverInfo: { name: "ruslan-shulga-portfolio", version: "1.0.0" },
    instructions: `The read-only portfolio of ${profile.name}, ${profile.headline} at JPMorgan Chase. Use get_resume for an overview, list_projects then get_project for depth, search_portfolio for a specific fact, and get_contact to reach him.`,
  },
);

export { handler as GET, handler as POST };
