import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Trials } from "@/components/trials";
import {
  addressOf,
  drawnFor,
  HOME,
  keyOf,
  NAMED,
  PIN_WINDOWS,
  parseWindow,
} from "@/lib/trials";
import { sweptTrial, trialsMetadata } from "@/lib/trials-words";

// A window's own address, /trials/<w>x<h> (.crew/sprint/63/contract.md, "The addresses"). The
// crew's windows and Iris's named ones are prerendered; any other grid window renders on its first
// request and is kept. Two answers never reach this page: next.config.ts sends 1440 × 900 to
// /trials (308) and every segment that isn't a window in the grid's range to the site's 404, since
// a page's own notFound() is an empty shell without script (app/log/[n]/page.tsx).

export function generateStaticParams() {
  return [...PIN_WINDOWS, ...NAMED]
    .filter((win) => keyOf(win) !== keyOf(HOME))
    .map((win) => ({ window: keyOf(win) }));
}

/** The trial at a window's address; any other window in the grid's range answers 307 to its grid window. */
async function trialOf({ params }: PageProps<"/trials/[window]">) {
  const asked = parseWindow((await params).window);
  const drawn = asked && drawnFor(asked);
  if (!asked || !drawn) notFound();
  if (keyOf(drawn) !== keyOf(asked)) redirect(addressOf(drawn));
  return sweptTrial(drawn);
}

export async function generateMetadata(
  props: PageProps<"/trials/[window]">,
): Promise<Metadata> {
  return trialsMetadata(await trialOf(props));
}

export default async function WindowPage(props: PageProps<"/trials/[window]">) {
  return <Trials trial={await trialOf(props)} />;
}
