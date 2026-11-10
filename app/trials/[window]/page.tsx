import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trials } from "@/components/trials";
import {
  HOME,
  isSwept,
  keyOf,
  NAMED,
  PIN_WINDOWS,
  parseWindow,
} from "@/lib/trials";
import { sweptTrial, trialsMetadata } from "@/lib/trials-words";

// A window's own address, /trials/<w>x<h> (.crew/sprint/63/contract.md, "The addresses"). The
// crew's windows and Iris's named ones are prerendered; any other grid window renders on its first
// request and is kept. proxy.ts answers every other address before this page renders (1440 × 900
// to /trials, a window off the sweep to its grid window, the rest to the site's 404), so only a
// swept window reaches it.

export function generateStaticParams() {
  return [...PIN_WINDOWS, ...NAMED]
    .filter((win) => keyOf(win) !== keyOf(HOME))
    .map((win) => ({ window: keyOf(win) }));
}

async function trialOf({ params }: PageProps<"/trials/[window]">) {
  const win = parseWindow((await params).window);
  if (!win || !isSwept(win)) notFound();
  return sweptTrial(win);
}

export async function generateMetadata(
  props: PageProps<"/trials/[window]">,
): Promise<Metadata> {
  return trialsMetadata(await trialOf(props));
}

export default async function WindowPage(props: PageProps<"/trials/[window]">) {
  return <Trials trial={await trialOf(props)} />;
}
