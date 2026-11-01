import type { MetadataRoute } from "next";
import { caseStudies } from "@/content/work";
import { studyPath } from "@/lib/portfolio";
import { SITE_URL } from "@/lib/site";
import { readSprintLog } from "@/lib/sprint-log";

// The sheet, the case studies, /ask, /evals, /crew, /read, the Log and a record per merged sprint, read when the site is built as
// the Log is. No lastModified: the build doesn't know when the owner's facts last changed, and a
// build-time date would claim a change on every deploy.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    ...caseStudies.map((study) => ({
      url: `${SITE_URL}${studyPath(study)}`,
    })),
    { url: `${SITE_URL}/ask` },
    { url: `${SITE_URL}/evals` },
    { url: `${SITE_URL}/crew` },
    { url: `${SITE_URL}/read` },
    { url: `${SITE_URL}/log` },
    ...readSprintLog().map((entry) => ({
      url: `${SITE_URL}/log/${entry.sprint}`,
    })),
  ];
}
