import type { Metadata } from "next";
import { profile } from "@/content/profile";
import { cardText } from "@/lib/card";
import { openGraph } from "@/lib/metadata";
import {
  addressOf,
  GAP,
  HELD_WINDOWS,
  type Kind,
  keyOf,
  kindOf,
  type Rule,
  rulesAt,
  sizeOf,
  type Win,
} from "@/lib/trials";
import { SWEEP_META, sweptAt } from "@/lib/trials-sweep";

// What the trials page says for a window, in Iris's words (.crew/sprint/63/words.md), from the
// committed sweep and the crew's record (lib/trials.ts). Probe's checks quote the same words.

/** A swept window's reading and what the record answers for it. */
export type Trial = {
  win: Win;
  /** The sweep's freeboard, in px to 0.1, its sign the kind's. */
  freeboard: number;
  kind: Kind;
  rules: readonly Rule[];
};

/** The trial at a swept window; undefined for a window the sweep doesn't hold. */
function trialAt(win: Win): Trial | undefined {
  const swept = sweptAt(win[0], win[1]);
  if (!swept) return undefined;
  const kind = kindOf(win, swept.freeboard);
  // The gap's words are 320 × 568's own (Atlas's sprint 44 ruling): if another pinned window ever
  // sinks, fail the build rather than print them under it (words.md, 3).
  if (kind === "gap" && keyOf(win) !== keyOf(GAP))
    throw new Error(
      `${sizeOf(win)} is pinned and sinks: the crew's own gap is only ${sizeOf(GAP)}`,
    );
  return { win, freeboard: swept.freeboard, kind, rules: rulesAt(win) };
}

/** The trial at a window the sweep must hold: a stale sweep fails the build, naming its command. */
export function sweptTrial(win: Win): Trial {
  const trial = trialAt(win);
  if (!trial)
    throw new Error(
      `lib/trials-sweep.json (taken on ${SWEEP_META.commit} in Chromium ${SWEEP_META.chromium}) has no reading at ${sizeOf(win)}: rewrite it with \`pnpm build && node .crew/sprint/63/trials-sweep.mjs\``,
    );
  return trial;
}

export const VERDICT: Record<Kind, string> = {
  gap: "The crew's own gap",
  held: "Held by the crew's checks",
  near: "A near miss",
  under: "Sunk",
  afloat: "Afloat",
};

const sinks = ({ kind }: Trial) => kind === "gap" || kind === "under";

/** `{f}`: the freeboard's size to one decimal. */
export const depthOf = ({ freeboard }: Trial) => Math.abs(freeboard).toFixed(1);

/** The freeboard signed as the kind reads: + when it floats, − (U+2212) when it sinks. */
export const signedOf = (trial: Trial) =>
  `${sinks(trial) ? "−" : "+"}${depthOf(trial)}`;

const NUMBER_WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

/** The answer's words around its depth, `{f} px`, which the page sets unbroken (words.md, 3). */
export function answerOf(trial: Trial): {
  before: string;
  after: string;
  /** The gap's own "8 px", unbroken too. */
  margin?: { before: string; after: string };
} {
  const n = trial.rules.length;
  switch (trial.kind) {
    case "gap":
      return {
        before: "The contact links end ",
        after:
          " under the waterline, and the crew knew. When it fitted phones in sprint 44, this window was outside the set, and Atlas, the crew's lead, ruled that its check would report where the links land here rather than hold them. Every phone window the crew checks keeps them at least ",
        margin: { before: "8 px", after: " clear." },
      };
    case "held":
      return {
        before: "The contact links stand ",
        after: ` above the waterline, and ${NUMBER_WORDS[n] ?? n} of the crew's checks ${n === 1 ? "holds" : "hold"} them there. If a change sank them in this window, the tests would fail and it couldn't merge.`,
      };
    case "near":
      return {
        before: "The contact links clear the waterline by ",
        after:
          ", less than a pixel. With no check holding them here, a change could sink them, and this page would say so.",
      };
    case "under":
      return {
        before: "You sank them. The contact links end ",
        after: ` under the waterline, in a window the crew's checks leave alone: they hold the links up in ${HELD_WINDOWS} others.`,
      };
    case "afloat":
      return {
        before: "The contact links stand ",
        after:
          " above the waterline. They float here on the page's own layout.",
      };
  }
}

/** The window's title and description (words.md, 6). */
function headOf(trial: Trial) {
  const size = sizeOf(trial.win);
  const verdict = VERDICT[trial.kind];
  const f = depthOf(trial);
  return {
    title: `${size}: ${verdict}, ${f} px ${sinks(trial) ? "under" : "clear"} — Sea trials — ${profile.name}`,
    description: `${size}: ${verdict}. ${profile.name}'s contact links end ${f} px ${sinks(trial) ? "below" : "above"} the foot of the first screen. Try to sink them in any window.`,
  };
}

// The site's card until the trials have their own (.crew/sprint/62/plan.md, call 4): a page that
// sets openGraph replaces the layout's whole object, the card from app/opengraph-image.tsx with it.
const card = cardText(profile);
const SITE_CARD = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${card.name}, ${card.lead}`,
  type: "image/png",
};

/** A window page's head: its own title, description and address, and the site's card. */
export function trialsMetadata(trial: Trial): Metadata {
  const { title, description } = headOf(trial);
  const url = addressOf(trial.win);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      ...openGraph,
      type: "website",
      title,
      description,
      url,
      images: [SITE_CARD],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_CARD],
    },
  };
}
