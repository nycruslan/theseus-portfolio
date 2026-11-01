import { profile } from "@/content/profile";
import { caseStudies } from "@/content/work";
import { OWNER_EMAIL, studyPath } from "@/lib/portfolio";
import { SITE_URL } from "@/lib/site";

// A map of the site for AI agents (https://llmstxt.org).
export function GET() {
  const studies = caseStudies.map(
    (study) =>
      `- [${study.title}](${SITE_URL}${studyPath(study)}): ${study.blurb}`,
  );
  const body = `# ${profile.name}

> ${profile.headline}, ${profile.location}. ${profile.bio}

## Case studies

${studies.join("\n")}

## For agents

- [MCP server](${SITE_URL}/api/mcp): Streamable HTTP, no auth, read-only. Tools: get_resume, list_projects, get_project, search_portfolio, get_eval_summary, get_contact.
- [Résumé as JSON](${SITE_URL}/api/me.json)
- [Résumé as a page](${SITE_URL}/read)
- [The assistant's eval scores](${SITE_URL}/evals)

## Contact

- [Email](mailto:${OWNER_EMAIL})
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
