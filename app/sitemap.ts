import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// One page for now. No lastModified: the build doesn't know when the owner's facts last changed,
// and a build-time date would claim a change on every deploy.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/` }];
}
