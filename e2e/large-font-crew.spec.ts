import { type Browser, expect, type Page, test } from "@playwright/test";
import {
  type CrewAnswer,
  FIXTURE_STUDIO,
  feedOf,
  livePage,
  toAnswer,
} from "./crew-live";
import {
  advance,
  ENTRY,
  PAUSE,
  press,
  REPLAY,
  untilPlayed,
} from "./crew-replay";
import { contextOf, setDefaultFont } from "./reader-font";

// Sprint 74 (.crew/sprint/74/contract.md, T35): /crew's live panel keeps whole words at a large
// font on a phone. Atlas's sweep of production on 2026-11-16 (feed live, crew resting after sprint
// 73) found "Pause updates" keeping its whole width in `.crew-status-row`'s `auto` column at 320 x
// 28, leaving the status 62 px: "Crew resting. Sprint 73 merged." printed "Cre / w / resti / ng." and
// the entry "Rep / lay / spri / nt / 73"; beside "Pause replay" the Activity heading's box was 71 px,
// "Activi / ty". Sprint 70 measured, with the feed down, "answering." splitting at 320 and 390 with
// 24 and 28 px, and the page scrolling sideways at 320 x 28.
//
// In three states, each on the default server's /crew with the poller ready and `/api/crew`
// answered by the harness (crew-live.ts's livePage, the clock paused): resting with a replay
// offered (resting.json with crew-replay.ts's REPLAY), the feed down, and mid-replay (the entry
// pressed, three moments played, Pause replay shown). At 320, 360 and 390 wide with a 16, 20, 24
// and 28 px default font, webfont blocked: no word of `.crew-status`, `.crew-entry` or
// `.crew-activity` breaks across lines (each word's text range's client rects share one top); the
// status row's words don't overlap Pause updates' box, nor the heading's Pause replay's where it
// shows; the page doesn't scroll sideways. One test per state, one context per font, the page
// resized through the widths, to keep CI's shards lean (.crew/STATE.md). Named to sort with the
// other large-font specs in shard 1, off the Log's shard 2; its three tests still move shard 2's
// edges, which split by count: two cheap log-dates tests come in from shard 1 and one log-yard
// test goes out to shard 3 (.crew/sprint/74).

const WIDTHS = [320, 360, 390] as const;
const HEIGHT = 740;
/** The default font, Chrome's Large and Very large, and 28 past them; 16 first, the baseline. */
const SIZES = [16, 20, 24, 28] as const;
const WORDS = [".crew-status", ".crew-entry", ".crew-activity"] as const;

const DOWN: CrewAnswer = { version: 1, state: "down", run: null };
const RESTING = toAnswer(
  feedOf("resting", { last: { replay: REPLAY } }),
  FIXTURE_STUDIO,
);

type Read = {
  root: string;
  overflow: number;
  state: string | null;
  /** Each word that breaks: where, and its pieces line by line. */
  broken: string[];
  /** Words over a button's box: which, and by how much. */
  over: string[];
  /** The selectors found on the page, and their words. */
  found: Record<string, string>;
};

/** The panel's words as they lie now. */
function readWords(page: Page): Promise<Read> {
  return page.evaluate(
    ([words, pause]) => {
      type Char = { node: Text; at: number; ch: string };
      const charsOf = (el: Element) => {
        const chars: Char[] = [];
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const node = n as Text;
          for (let at = 0; at < node.data.length; at++)
            chars.push({ node, at, ch: node.data[at] ?? "" });
        }
        return chars;
      };
      const rangeOf = (from: Char, to: Char) => {
        const range = document.createRange();
        range.setStart(from.node, from.at);
        range.setEnd(to.node, to.at + 1);
        return range;
      };
      const rectsOf = (range: Range) =>
        [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      /** The element's words, each its characters. */
      const wordsOf = (el: Element) => {
        const out: Char[][] = [];
        let word: Char[] = [];
        for (const c of charsOf(el)) {
          if (/\s/.test(c.ch)) {
            if (word.length) out.push(word);
            word = [];
          } else word.push(c);
        }
        if (word.length) out.push(word);
        return out;
      };
      const shown = (el: Element) =>
        el.getClientRects().length > 0 &&
        el.checkVisibility({ visibilityProperty: true, opacityProperty: true });
      const depth = (a: DOMRect, b: DOMRect) =>
        Math.max(
          0,
          Math.min(
            Math.min(a.right, b.right) - Math.max(a.left, b.left),
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
          ),
        );

      const panel = document.querySelector('section[aria-labelledby="crew"]');
      const broken: string[] = [];
      const found: Record<string, string> = {};
      for (const selector of words)
        for (const el of panel?.querySelectorAll(selector) ?? []) {
          if (!shown(el)) continue;
          found[selector] = (el.textContent ?? "").replace(/\s+/g, " ").trim();
          for (const word of wordsOf(el)) {
            const first = word[0];
            const last = word.at(-1);
            if (!first || !last) continue;
            const tops = rectsOf(rangeOf(first, last)).map((r) => r.top);
            if (Math.max(...tops) - Math.min(...tops) <= 1) continue;
            // Its pieces, a character's line at a time, as a reader sees them.
            const pieces: string[] = [];
            let top = Number.NaN;
            for (const c of word) {
              const t = rectsOf(rangeOf(c, c))[0]?.top ?? top;
              if (Math.abs(t - top) > 1 || pieces.length === 0) pieces.push("");
              pieces[pieces.length - 1] += c.ch;
              top = t;
            }
            broken.push(`${selector}: ${pieces.join(" / ")}`);
          }
        }

      // Words over a shown button's box: the status row's over Pause updates, the heading's over
      // Pause replay.
      const over: string[] = [];
      const pairs = [
        ["button[data-pause]", [".crew-status", ".crew-entry"]],
        [pause, [".crew-activity"]],
      ] as const;
      for (const [button, texts] of pairs) {
        const b = panel?.querySelector(button);
        if (!b || !shown(b)) continue;
        const box = b.getBoundingClientRect();
        for (const selector of texts)
          for (const el of panel?.querySelectorAll(selector) ?? []) {
            if (!shown(el)) continue;
            for (const word of wordsOf(el)) {
              const first = word[0];
              const last = word.at(-1);
              if (!first || !last) continue;
              const deep = Math.max(
                0,
                ...rectsOf(rangeOf(first, last)).map((r) => depth(r, box)),
              );
              if (deep > 0.5)
                over.push(
                  `${selector}'s "${word.map((c) => c.ch).join("")}" ${deep.toFixed(1)} px into ${button}`,
                );
            }
          }
      }
      const root = document.documentElement;
      return {
        root: getComputedStyle(root).fontSize,
        overflow: root.scrollWidth - root.clientWidth,
        state: panel?.getAttribute("data-crew-state") ?? null,
        broken,
        over,
        found,
      };
    },
    [WORDS, PAUSE] as const,
  );
}

type State = {
  name: string;
  answer: CrewAnswer;
  /** `[data-crew-state]` once the poll settles. */
  state: string;
  /** The words each state must show, so a missing one can't pass. */
  shows: readonly string[];
  /** Brings the page to the state once the poller is ready. */
  bring?: (page: Page) => Promise<void>;
};

const STATES: State[] = [
  {
    name: "resting with a replay offered",
    answer: RESTING,
    state: "resting",
    shows: WORDS,
  },
  {
    name: "the feed down",
    answer: DOWN,
    state: "down",
    shows: [".crew-status"],
  },
  {
    name: "mid-replay",
    answer: RESTING,
    state: "resting",
    shows: WORDS,
    async bring(page) {
      expect(await press(page, ENTRY), "the entry has a box to press").toBe(
        true,
      );
      await untilPlayed(page, 1);
      await advance(page, 2);
      const read = await untilPlayed(page, 3);
      expect(
        [
          read.replaying > 0,
          read.pause?.shown,
          read.heading?.startsWith("Replay"),
        ],
        "mid-replay: replaying, Pause replay shown, the heading Replay's",
      ).toEqual([true, true, true]);
    },
  },
];

const T35 =
  "T35 /crew's panel keeps whole words at a large font on a phone: at 320, 360 and 390 wide with a 16, 20, 24 or 28 px default font, webfont blocked, the poller ready, no word of .crew-status, .crew-entry or .crew-activity breaks across lines, the status row's words stay off Pause updates' box and the heading's off Pause replay's where it shows, and the page doesn't scroll sideways";

async function sweep(browser: Browser, state: State) {
  for (const size of SIZES) {
    const { context, page, aborted } = await contextOf(browser, {
      width: WIDTHS[0],
      height: HEIGHT,
      blocked: true,
    });
    try {
      await setDefaultFont(context, page, size);
      const live = await livePage(page, "/crew", { json: state.answer });
      expect(live.ready, `Pause updates ready at ${size} px`).toBe(true);
      await state.bring?.(page);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        const where = `${state.name}, ${width} x ${HEIGHT}, ${size} px default font, fonts blocked`;
        const read = await readWords(page);
        // The setting took: the root's font is the reader's default.
        expect(read.root, `the root's font, ${where}`).toBe(`${size}px`);
        expect(read.state, `[data-crew-state], ${where}`).toBe(state.state);
        expect
          .soft(Object.keys(read.found), `the words shown, ${where}`)
          .toEqual(expect.arrayContaining([...state.shows]));
        expect
          .soft(read.broken, `words broken across lines, ${where}`)
          .toEqual([]);
        expect.soft(read.over, `words over a button, ${where}`).toEqual([]);
        expect
          .soft(read.overflow, `the page's sideways scroll, ${where}`)
          .toBeLessThanOrEqual(0);
      }
      expect
        .soft(aborted.count, `web font requests refused at ${size} px`)
        .toBeGreaterThan(0);
    } finally {
      await context.close();
    }
  }
}

for (const state of STATES)
  test(`${T35} (${state.name})`, async ({ browser }) => {
    test.setTimeout(90_000);
    await sweep(browser, state);
  });
