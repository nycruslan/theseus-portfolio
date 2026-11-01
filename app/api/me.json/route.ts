import { profile } from "@/content/profile";
import { caseStudies } from "@/content/work";
import { OWNER_EMAIL, studyPath } from "@/lib/portfolio";
import { SITE_URL } from "@/lib/site";

// The résumé as JSON, for anything that would rather not parse a page.
export function GET() {
  return Response.json({
    ...profile,
    email: OWNER_EMAIL,
    caseStudies: caseStudies.map((study) => ({
      slug: study.slug,
      title: study.title,
      summary: study.blurb,
      results: study.metrics,
      stack: study.stack,
      url: `${SITE_URL}${studyPath(study)}`,
    })),
    machineReadable: {
      mcp: `${SITE_URL}/api/mcp`,
      llmsTxt: `${SITE_URL}/llms.txt`,
      evals: `${SITE_URL}/evals`,
    },
  });
}
