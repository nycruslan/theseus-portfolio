import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { readSprintLog } from "@/lib/sprint-log";

// The sheet, /read, the Log and a record per merged sprint, read when the site is built as the Log
// is. No lastModified: the build doesn't know when the owner's facts last changed, and a build-time
// date would claim a change on every deploy.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/read` },
    { url: `${SITE_URL}/log` },
    ...readSprintLog().map((entry) => ({
      url: `${SITE_URL}/log/${entry.sprint}`,
    })),
  ];
}
