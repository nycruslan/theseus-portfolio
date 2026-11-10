import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trials } from "@/components/trials";
import { isSwept, keyOf, PRERENDERED, parseWindow } from "@/lib/trials";
import { trialCardImage } from "@/lib/trials-card";
import { sweptTrial, trialsMetadata } from "@/lib/trials-words";

// A window's own address, /trials/<w>x<h> (.crew/sprint/63/contract.md, "The addresses"). The
// crew's windows and Iris's named ones are prerendered; any other grid window renders on its first
// request and is kept. proxy.ts answers every other address before this page renders (1440 × 900
// to /trials, a window off the sweep to its grid window, the rest to the site's 404), so only a
// swept window reaches it.

export function generateStaticParams() {
  return PRERENDERED.map((win) => ({ window: keyOf(win) }));
}

async function trialOf({ params }: PageProps<"/trials/[window]">) {
  const win = parseWindow((await params).window);
  if (!win || !isSwept(win)) notFound();
  return sweptTrial(win);
}

export async function generateMetadata(
  props: PageProps<"/trials/[window]">,
): Promise<Metadata> {
  const trial = await trialOf(props);
  return trialsMetadata(trial, trialCardImage(trial));
}

export default async function WindowPage(props: PageProps<"/trials/[window]">) {
  return <Trials trial={await trialOf(props)} />;
}
