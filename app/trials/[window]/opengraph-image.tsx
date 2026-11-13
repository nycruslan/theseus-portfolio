import { HOME, keyOf, PRERENDERED, parseWindow } from "@/lib/trials";
import { TRIAL_CARD } from "@/lib/trials-card";
import { trialCardResponse } from "@/lib/trials-card-art";

// A window's own card, /trials/<w>x<h>/opengraph-image (.crew/sprint/64/contract.md, T15),
// prerendered for the windows whose pages are, and drawn on first request for any other swept
// window, as its page is. proxy.ts redirects a window off the sweep before its page renders, but
// its matcher takes one segment, so this route refuses such a window itself: no card but a swept
// window's. 1440 × 900's card is /trials's (app/trials/opengraph-image.tsx), since its address
// is. The page names the card with the window's own alt (trialsMetadata): a card file's `alt` is
// one string for every window (memory, sprint 54).

export const size = { width: TRIAL_CARD.width, height: TRIAL_CARD.height };
export const contentType = TRIAL_CARD.type;

export function generateStaticParams() {
  return PRERENDERED.map((win) => ({ window: keyOf(win) }));
}

export default async function WindowCardImage({
  params,
}: {
  params: Promise<{ window: string }>;
}) {
  const win = parseWindow((await params).window);
  if (!win || keyOf(win) === keyOf(HOME))
    return new Response("Not Found", { status: 404 });
  return trialCardResponse(win);
}
