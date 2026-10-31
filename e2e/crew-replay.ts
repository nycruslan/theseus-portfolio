import type { Page } from "@playwright/test";
import { PLANKS } from "../lib/hull-layouts";
import type { Answer, Crew } from "./crew-feed";
import { STATE_WAIT, untilState } from "./crew-feed";
import { feedOf, replayOf } from "./crew-live";
import { MERGED, SEAT_OF } from "./retros";

// The oracle and the page readers for B4e, the replay on /crew (.crew/sprint/37/contract.md, with
// amendment 1), in this suite's own lines from the contract's words, never the page's code. The
// route's `run.replay` is crew-live.ts's `replayOf` (inside `toAnswer`); this file holds the
// fixture's replay and its variants, what the list shows after k moments, and the readers for the
// entry, the pause, the Activity block, the stamp and the key.

type Json = Record<string, unknown>;
export type Entry = {
  kind: string;
  at: string;
  who: string | null;
  text: string;
};

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const hhmm = (at: number) => new Date(at).toISOString().slice(11, 16);
const dayMon = (at: number) => {
  const d = new Date(at);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

/** resting.json's moments (sprint 29), oldest first: the replay's last 10, the merge 9th of them. */
const RESTING_MOMENTS = [
  ...((feedOf("resting").last as { moments: Entry[] }).moments ?? []),
].reverse();

/**
 * The replay fixture's `last.replay` (the contract's "Checks"): resting.json's 10 moments, oldest
 * first, behind four older ones on the UTC day before. Of the four, an unknown kind and an empty
 * text are dropped, and the first is out of order (newer than the fourth). So 12 are kept, the
 * first on 23 Oct (the heading's day, so the other 10 show theirs), the merge the 11th and `end`
 * the 12th.
 */
export const REPLAY: Entry[] = [
  {
    kind: "ticket",
    at: "2026-10-23T23:55:40.000Z",
    who: "lead",
    text: "Briefed Quill on B5's plan",
  },
  {
    kind: "standup",
    at: "2026-10-23T23:56:30.000Z",
    who: "lead",
    text: "An unknown kind is dropped",
  },
  {
    kind: "decision",
    at: "2026-10-23T23:57:10.000Z",
    who: "lead",
    text: "",
  },
  {
    kind: "decision",
    at: "2026-10-23T23:52:10.000Z",
    who: "lead",
    text: "Sprint 29 is B5's plan",
  },
  ...RESTING_MOMENTS,
];

/** 65 valid entries, oldest first, a minute apart: the route keeps the newest 60. */
export const REPLAY_65: Entry[] = Array.from({ length: 65 }, (_, i) => ({
  kind: ["ticket", "decision", "report", "verdict"][i % 4] ?? "report",
  at: new Date(Date.UTC(2026, 9, 23, 22, i, 0)).toISOString(),
  who: "lead",
  text: `Moment ${i + 1} of 65`,
}));

/** A replay whose every entry breaks B4a's rules: no replay. */
const REPLAY_BAD: Entry[] = [
  { kind: "standup", at: "2026-10-24T00:10:00.000Z", who: null, text: "No" },
  { kind: "ticket", at: "2026-10-24T00:11:00.000Z", who: null, text: "" },
  { kind: "report", at: "not a time", who: null, text: "No time" },
];

/** The replay's sprint, and the plank it seats. */
export const N = 29;

/**
 * A retro sprint whose seat anchors the detail crop at the other end of the hull from 29's (the
 * crop's end is the one nearest the seat's middle, either side of midship at 312 units): the one
 * whose seat's middle lies farthest the other way.
 */
export const FAR = (() => {
  const middle = (sprint: number) => {
    const p = PLANKS.find((q) => q.id === SEAT_OF.get(sprint));
    return p ? (p.x0 + p.x1) / 2 : Number.NaN;
  };
  const aft = middle(N) < 312;
  const others = MERGED.map((r) => r.sprint).filter(
    (s) => s !== N && !Number.isNaN(middle(s)) && middle(s) < 312 !== aft,
  );
  others.sort((a, b) => (aft ? middle(b) - middle(a) : middle(a) - middle(b)));
  return others[0] ?? Number.NaN;
})();

const resting = (last: Json): Partial<Answer> => ({
  fixture: "resting",
  patch: { last },
});

/** The kept sites' channels: each variant of the replay fixture (crew-feed.ts's Answer). */
export const SITES = {
  replay: resting({ replay: REPLAY }),
  "replay-65": resting({ replay: REPLAY_65 }),
  "replay-999": resting({ sprint: 999, replay: REPLAY }),
  "replay-bad": resting({ replay: REPLAY_BAD }),
  "replay-null": resting({ sprint: null, replay: REPLAY }),
  "replay-far": resting({ sprint: FAR, replay: REPLAY }),
} satisfies Record<string, Partial<Answer>>;
export type SiteName = keyof typeof SITES | "live" | "open" | "resting";

export type ReplaySite = {
  name: string;
  base: string;
  /** The feed's answer the site reads now (asOf fresh), as the oracle reads it. */
  body(): Json;
  origin: string;
  seen: string;
  ms: number;
};

/**
 * A kept site's /crew showing resting (or, for live and open, its fixture's state), once a worker:
 * the replay variants are channels of their own, kept until the worker ends.
 */
export function replaySite(crew: Crew, name: SiteName): Promise<ReplaySite> {
  return crew.once(`replay ${name}`, async () => {
    const answer: Partial<Answer> =
      name in SITES
        ? SITES[name as keyof typeof SITES]
        : { fixture: name as "live" | "open" | "resting" };
    const site = await crew.site(name, answer, true);
    const state = name === "live" || name === "open" ? name : "resting";
    const shown = await untilState(site.baseURL, state, STATE_WAIT);
    return {
      name,
      base: site.baseURL,
      body: () => crew.feed.body(name),
      origin: crew.feed.origin,
      ...shown,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// What the list shows

export type Listed = {
  kind: string;
  datetime: string;
  shown: string;
  text: string;
};

/** "Replay, ‹d Mon› (UTC)": the day of the replay's first moment. */
export const replayHeading = (kept: { at: string }[]) =>
  kept[0] ? `Replay, ${dayMon(Date.parse(kept[0].at))} (UTC)` : null;

/**
 * The list after k moments played: the first k kept entries, newest on top, each time in UTC
 * HH:MM with its day when it differs from the heading's (the first moment's day).
 */
export function listed(
  kept: { kind: string; at: string; text: string }[],
  k: number,
): Listed[] {
  const first = kept[0];
  const day = first ? dayMon(Date.parse(first.at)) : "";
  return kept
    .slice(0, k)
    .reverse()
    .map((m) => {
      const at = Date.parse(m.at);
      return {
        kind: m.kind,
        datetime: new Date(at).toISOString(),
        shown: dayMon(at) === day ? hhmm(at) : `${dayMon(at)} ${hhmm(at)}`,
        text: m.text,
      };
    });
}

/** The fixture's kept entries (12), and where the merge falls (11th, 1-based). */
export const KEPT = replayOf(REPLAY);
export const MERGE_AT = KEPT.findIndex((m) => m.kind === "merge") + 1;

/** "One tick on the plank in pencil for each moment above, up to ten." (B4.50) */
export const KEY_WORDS =
  "One tick on the plank in pencil for each moment above, up to ten.";

// ---------------------------------------------------------------------------------------------
// The page

export const ENTRY = "a[data-replay]";
export const PAUSE = "button[data-replay-pause]";
export const STAMP = "[data-replay-stamp]";

type Box = { left: number; top: number; right: number; bottom: number };
type Control = {
  text: string;
  href: string | null;
  pressed: string | null;
  shown: boolean;
  box: Box | null;
  focused: boolean;
};

export type ReplayRead = {
  entries: number;
  entry: Control | null;
  /** The entry's previous element is `p[data-status]`. */
  entryAfterStatus: boolean;
  pauses: number;
  pause: Control | null;
  /** `#replay`'s tag, and whether it holds `ol[data-moments]`. */
  anchor: { tag: string; holdsList: boolean } | null;
  /** The element with `data-replaying`, and whether it holds `ol[data-moments]`. */
  replaying: number;
  replayingHoldsList: boolean;
  heading: string | null;
  /** `ol[data-moments] > li`s, read as readPanel reads them. */
  moments: Listed[];
  nows: number;
  announce: string;
  plan: {
    replay: boolean;
    run: string | null;
    focus: string | null;
    tally: boolean;
  };
  stamps: number;
  stamp: { shown: boolean; text: string; box: Box | null } | null;
  keys: number;
  key: {
    shown: boolean;
    text: string;
    afterList: boolean;
    svgs: number;
    hiddenSvgs: number;
  } | null;
  scrollY: number;
  active: string;
};

/** The replay's parts as the page has them now. */
export function readReplay(page: Page): Promise<ReplayRead> {
  return page.evaluate(
    ({ ENTRY, PAUSE, STAMP }) => {
      const squash = (t: string | null | undefined) =>
        (t ?? "").replace(/\s+/g, " ").trim();
      const shown = (el: Element) =>
        el.getClientRects().length > 0 &&
        el.checkVisibility({ visibilityProperty: true, opacityProperty: true });
      const rect = (el: Element) => {
        if (el.getClientRects().length === 0) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      };
      const control = (el: Element | null) =>
        el
          ? {
              text: squash(el.textContent),
              href: el.getAttribute("href"),
              pressed: el.getAttribute("aria-pressed"),
              shown: shown(el),
              box: rect(el),
              focused: document.activeElement === el,
            }
          : null;
      const panel = document.querySelector('section[aria-labelledby="crew"]');
      const list = panel?.querySelector("ol[data-moments]") ?? null;
      const anchor = document.getElementById("replay");
      const replaying = document.querySelectorAll("[data-replaying]");
      const plan = document.querySelector("[data-plan]");
      const stamp = document.querySelector(STAMP);
      const key = document.querySelector("p[data-tick-key]");
      const entry = document.querySelector(ENTRY);
      const active = document.activeElement;
      return {
        entries: document.querySelectorAll(ENTRY).length,
        entry: control(entry),
        entryAfterStatus: Boolean(
          entry?.previousElementSibling?.matches("p[data-status]"),
        ),
        pauses: document.querySelectorAll(PAUSE).length,
        pause: control(document.querySelector(PAUSE)),
        anchor: anchor
          ? {
              tag: anchor.tagName.toLowerCase(),
              holdsList: Boolean(list && anchor.contains(list)),
            }
          : null,
        replaying: replaying.length,
        replayingHoldsList: Boolean(list && replaying[0]?.contains(list)),
        heading:
          [...(panel?.querySelectorAll("h2") ?? [])]
            .map((h) => squash(h.textContent))
            .find((t) => /^(Activity|Replay)\b/.test(t)) ?? null,
        moments: [...(list?.querySelectorAll(":scope > li") ?? [])].map(
          (li) => {
            const time = li.querySelector("time");
            const at = squash(time?.textContent);
            const all = squash(li.textContent);
            return {
              kind: li.getAttribute("data-kind") ?? "",
              datetime: time?.getAttribute("datetime") ?? "",
              shown: at,
              text: all.startsWith(at) ? all.slice(at.length).trim() : all,
            };
          },
        ),
        nows: document.querySelectorAll("[data-now]").length,
        announce: squash(
          document.querySelector("[data-announce]")?.textContent,
        ),
        plan: {
          replay: Boolean(plan?.hasAttribute("data-replay")),
          run: plan?.getAttribute("data-run") ?? null,
          focus: plan?.getAttribute("data-focus") ?? null,
          tally: Boolean(plan?.hasAttribute("data-tally")),
        },
        stamps: document.querySelectorAll(STAMP).length,
        stamp: stamp
          ? {
              shown: shown(stamp),
              text: squash(stamp.textContent),
              box: rect(stamp),
            }
          : null,
        keys: document.querySelectorAll("p[data-tick-key]").length,
        key: key
          ? {
              shown: shown(key),
              text: squash(key.textContent),
              afterList: Boolean(
                list && key.previousElementSibling === list && shown(key),
              ),
              svgs: key.querySelectorAll("svg").length,
              hiddenSvgs: key.querySelectorAll('svg[aria-hidden="true"]')
                .length,
            }
          : null,
        scrollY: window.scrollY,
        active: active
          ? `<${active.tagName.toLowerCase()}${active.matches(ENTRY) ? " entry" : active.matches(PAUSE) ? " pause" : active.matches("button[data-pause]") ? " Pause updates" : active.id ? `#${active.id}` : ""}>`
          : "none",
      };
    },
    { ENTRY, PAUSE, STAMP },
  );
}

/** k: the moments listed while the block replays (0 when nothing is replaying). */
export const momentsPlayed = (r: ReplayRead) =>
  r.replaying > 0 ? r.moments.length : 0;

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/**
 * Clicks a control at its centre with the mouse, as a visitor does (a locator's checks wait on a
 * paused clock): into view first, instantly, only when it is out of view, so a press that is in
 * view moves nothing. False when there is no box to click.
 */
export async function press(page: Page, selector: string) {
  const at = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el || el.getClientRects().length === 0) return null;
    let r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) {
      el.scrollIntoView({ block: "center", behavior: "instant" });
      r = el.getBoundingClientRect();
    }
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, selector);
  if (!at) return false;
  await page.mouse.click(at.x, at.y);
  await sleep(150);
  return true;
}

/** The page's read once it shows k moments played, up to 2 s of real time (React commits off the clock). */
export async function untilPlayed(page: Page, k: number) {
  const end = Date.now() + 2_000;
  let read = await readReplay(page);
  while (momentsPlayed(read) !== k && Date.now() < end) {
    await sleep(50);
    read = await readReplay(page);
  }
  return read;
}

/** Runs the clock `ms` and reads the page after a moment of real time for React to commit. */
export async function stepClock(page: Page, ms: number) {
  await page.clock.runFor(ms);
  await sleep(120);
  return readReplay(page);
}

/**
 * Whether `selector` takes focus now (focus() and read back), with the focus and scroll put back
 * as they were.
 */
export function focusable(page: Page, selector: string) {
  return page.evaluate((s) => {
    const el = document.querySelector<HTMLElement>(s);
    if (!el) return false;
    const was = document.activeElement as HTMLElement | null;
    const [x, y] = [scrollX, scrollY];
    el.focus({ preventScroll: true });
    const took = document.activeElement === el;
    if (took) el.blur();
    was?.focus?.({ preventScroll: true });
    scrollTo(x, y);
    return took;
  }, selector);
}

/** Blurs whatever has focus, so a key goes to the body. */
export const toBody = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

/**
 * The glyph is a CSS box, not a character: the control's text is exactly its name, and an
 * aria-hidden child or a ::before or ::after with no text has a box (B4.45).
 */
export function cssGlyph(page: Page, selector: string) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const hidden = [...el.querySelectorAll("[aria-hidden]")].some((g) => {
      const r = g.getBoundingClientRect();
      const before = getComputedStyle(g, "::before");
      const after = getComputedStyle(g, "::after");
      const pseudo = [before, after].some(
        (p) =>
          !["none", "normal"].includes(p.content) &&
          Number.parseFloat(p.width) > 0,
      );
      return (g.textContent ?? "").trim() === "" && (r.width > 0 || pseudo);
    });
    const pseudo = (["::before", "::after"] as const).some((p) => {
      const c = getComputedStyle(el, p);
      return ['""', "''"].includes(c.content) && Number.parseFloat(c.width) > 0;
    });
    return {
      text: el.textContent ?? "",
      glyph: hidden || pseudo,
    };
  }, selector);
}

/** The pace: one moment every 1,500 ms. */
export const STEP = 1_500;

/**
 * Runs the clock `steps` steps of 1,500 ms, one at a time with real time between for React to
 * commit, so a step timed after a commit is never skipped, and reads the page.
 */
export async function advance(page: Page, steps: number) {
  for (let i = 0; i < steps; i++) {
    await page.clock.runFor(STEP);
    await sleep(120);
  }
  return readReplay(page);
}

/** Focuses `selector` from script (a locator's focus waits on a paused clock). */
export const focusOn = (page: Page, selector: string) =>
  page.evaluate((s) => {
    document.querySelector<HTMLElement>(s)?.focus();
  }, selector);
