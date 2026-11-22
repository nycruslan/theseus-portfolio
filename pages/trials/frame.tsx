import type { InferGetStaticPropsType } from "next";
import Head from "next/head";
import { Sheet } from "@/components/sheet";
import { profile } from "@/content/profile";
import { title } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import { readSprintLog, type SprintEntry } from "@/lib/sprint-log";

// The frame's address (.crew/sprint/63/decisions.md, 2): / as the site builds it, in the feed's
// down state, for the trials page to frame at any window. The frame's size is the iframe's box, so
// one address serves every window. Like every page, only the site and the Studio may frame it
// (next.config.ts).
//
// It is framed sandboxed without allow-scripts, so its document must carry no script: the sandbox
// refuses each one with a console error (48 on every trials view, .crew/sprint/76/contract.md).
// That's why it's the site's one Pages Router page. An App Router page always ships Next's runtime
// (16.4 adds its bootstrap scripts and inlines its RSC payload as scripts on every render), and a
// route handler can't render the sheet, since react-dom/server throws under the react-server
// condition route handlers run in. `unstable_runtimeJS: false` makes the Pages Router render this
// page at build with no script at all. The flag is undocumented and absent from Next's types for a
// page's config, which is why `runtime` (the default) sits beside it for the build's type check;
// T36 (e2e/trials-console.spec.ts) fails if a Next upgrade stops honouring it.
export const config = { runtime: "nodejs", unstable_runtimeJS: false };

export function getStaticProps() {
  // A page's props must be JSON, and an entry's absent fields are `undefined`, which Next refuses.
  const entries: SprintEntry[] = JSON.parse(JSON.stringify(readSprintLog()));
  return { props: { entries } };
}

// It keeps /'s title and description. It isn't a page of its own, so search engines skip it and
// credit /.
export default function Frame({
  entries,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={profile.bio} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href={SITE_URL} />
      </Head>
      {/* The window never scrolls and draws no scrollbar, so its document is exactly the window's
        width: a scrollbar would lay / out narrower than the window it claims (plan.md, risk 6). The
        Pages Router wraps the page in div#__next, which `display: contents` takes out of the layout,
        so the sheet's parts are the body's flex items, as on /. */}
      <style>{"html{overflow:hidden}#__next{display:contents}"}</style>
      <Sheet entries={entries} layer={{ state: "down" }} />
    </>
  );
}
