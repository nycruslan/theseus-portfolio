import type { Link } from "@/content/profile";

/**
 * A project link's label (.crew/sprint/23/contract.md, data rules): the label of the owner's own
 * link on the same host, so a project on GitHub reads "GitHub" as his profile link does; failing
 * that, the host itself without "www.".
 */
export function projectLinkLabel(href: string, links: readonly Link[]) {
  const host = new URL(href).host;
  const own = links.find((link) => new URL(link.href).host === host);
  return own ? own.label : host.replace(/^www\./, "");
}
